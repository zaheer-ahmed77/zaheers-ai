import { Worker } from 'bullmq'
import 'dotenv/config'
import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import pdfParse from 'pdf-parse-new'
import { prisma } from '../lib/prisma.js'

// gemini-embedding-001 always outputs 3072-dimensional vectors
const EXPECTED_EMBEDDING_DIM = 3072

const connection = { url: process.env.REDIS_URL }

// ── Startup checks ────────────────────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  🔧  Aura AI — BullMQ Worker starting up')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (!process.env.REDIS_URL) {
  console.error('❌  REDIS_URL is not set in .env — worker CANNOT connect to Redis.')
  console.error('    Start Redis with: docker-compose up -d')
}

const missingEnv: string[] = []
if (!process.env.PINECONE_API_KEY) missingEnv.push('PINECONE_API_KEY')
if (!process.env.PINECONE_INDEX)   missingEnv.push('PINECONE_INDEX')
if (!process.env.GEMINI_API_KEY)   missingEnv.push('GEMINI_API_KEY')

if (missingEnv.length > 0) {
  console.warn(`⚠️   Missing env vars: ${missingEnv.join(', ')}`)
  console.warn('    Documents will be parsed but vectors will NOT be stored in Pinecone.')
} else {
  console.log(`✅  GEMINI_API_KEY     set`)
  console.log(`✅  PINECONE_API_KEY   set`)
  console.log(`✅  PINECONE_INDEX     "${process.env.PINECONE_INDEX}"`)
}

console.log(`    REDIS_URL: ${process.env.REDIS_URL
  ? process.env.REDIS_URL.replace(/:[^:@]+@/, ':***@')
  : 'NOT SET'}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// ── Pinecone index dimension verification (runs once at startup) ──────────────
async function verifyPineconeIndex(): Promise<void> {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) return

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    const info = await pc.describeIndex(process.env.PINECONE_INDEX)
    const dim = info.dimension
    const metric = info.metric

    console.log(`[Pinecone] Index "${process.env.PINECONE_INDEX}" — dimension: ${dim}, metric: ${metric}`)

    if (dim !== EXPECTED_EMBEDDING_DIM) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error(`❌  PINECONE DIMENSION MISMATCH!`)
      console.error(`    Your index has ${dim} dimensions.`)
      console.error(`    gemini-embedding-001 produces ${EXPECTED_EMBEDDING_DIM} dimensions.`)
      console.error(`    Upserts WILL FAIL until you create a matching index.`)
      console.error(`    Run: npx tsx scripts/setup-pinecone.ts`)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } else {
      console.log(`✅  Pinecone dimension verified: ${dim} ✓  (matches gemini-embedding-001)`)
    }

    if (metric !== 'cosine') {
      console.warn(`⚠️   Pinecone index metric is "${metric}" — cosine is recommended for text embeddings`)
    }
  } catch (err: any) {
    console.error(`❌  Could not verify Pinecone index "${process.env.PINECONE_INDEX}": ${err.message}`)
    console.error('    Check that PINECONE_API_KEY is correct and the index exists.')
  }
}

verifyPineconeIndex()

// ── BullMQ Worker ─────────────────────────────────────────────────────────────
const worker = new Worker('file-ingest', async job => {
  const { fileUrl, userId, fileName } = job.data

  console.log(`\n━━━ [Worker] Job ${job.id} started ━━━`)
  console.log(`    File:   ${fileName}`)
  console.log(`    User:   ${userId}`)
  console.log(`    Path:   ${fileUrl}`)

  // ── Step 1: Read file from disk ───────────────────────────────────────────
  let extractedText = ''
  try {
    const fs = await import('fs/promises')
    const buffer = await fs.readFile(fileUrl)
    console.log(`[Worker] ✅ File read: ${buffer.length} bytes`)

    if (fileName.toLowerCase().endsWith('.pdf')) {
      console.log(`[Worker] Parsing PDF with pdf-parse-new...`)
      const data = await (pdfParse as any)(buffer)
      extractedText = data.text || ''
      console.log(`[Worker] ✅ PDF parsed: ${extractedText.length} characters across ${data.numpages || 1} page(s)`)
    } else if (fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) {
      console.log(`[Worker] Parsing Word document with officeparser...`)
      const officeParser = await import('officeparser')
      // Pass the file path directly so it can infer the extension
      extractedText = (await officeParser.parseOffice(fileUrl)) as any as string
      extractedText = extractedText || ''
      console.log(`[Worker] ✅ Word document parsed: ${extractedText.length} characters`)
    } else {
      extractedText = buffer.toString('utf-8')
      console.log(`[Worker] ✅ Text file read: ${extractedText.length} characters`)
    }
  } catch (err: any) {
    console.error(`[Worker] ❌ Failed to read/parse file "${fileName}":`, err.message)
    throw new Error(`Parse failed: ${err.message}`)
  }

  extractedText = String(extractedText)
  if (!extractedText.trim()) {
    console.error(`[Worker] ❌ File "${fileName}" is empty or produced no extractable text`)
    throw new Error('File is empty or could not be parsed.')
  }

  // ── Step 1.5: Save raw text to DB and resolve User ──────────────────────
  let internalUserId = userId;
  try {
    // Ensure the user exists in the DB so we can use their CUID
    let user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: `${userId}@placeholder.com` }
      })
    }
    
    internalUserId = user.id; // Guaranteed to be CUID now

    await prisma.document.create({
      data: {
        userId: internalUserId,
        fileName,
        content: extractedText
      }
    })
    console.log(`[Worker] ✅ Saved raw text to Document table for CUID ${internalUserId}`)
  } catch (dbErr: any) {
    console.error(`[Worker] ❌ Failed to save raw text to Document table:`, dbErr.message)
    // We don't throw here so that Pinecone ingestion can still proceed
  }

  // ── Step 2: Split into chunks ─────────────────────────────────────────────
  console.log(`[Worker] Splitting into chunks (chunkSize=1000, overlap=200)...`)
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
  const chunks = await splitter.splitText(extractedText)
  console.log(`[Worker] ✅ ${chunks.length} chunks created from ${extractedText.length} characters`)

  // ── Step 3: Embed and upsert to Pinecone ─────────────────────────────────
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX || !process.env.GEMINI_API_KEY) {
    console.warn('[Worker] ⚠️  Skipping Pinecone upsert — missing required env vars:')
    if (!process.env.PINECONE_API_KEY) console.warn('    - PINECONE_API_KEY')
    if (!process.env.PINECONE_INDEX)   console.warn('    - PINECONE_INDEX')
    if (!process.env.GEMINI_API_KEY)   console.warn('    - GEMINI_API_KEY')
  } else {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    const index = pc.index(process.env.PINECONE_INDEX)

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-embedding-001',
    })

    const batchSize = 10
    const totalBatches = Math.ceil(chunks.length / batchSize)
    const allVectors: any[] = []

    console.log(`[Worker] Embedding ${chunks.length} chunks in ${totalBatches} batch(es) of ${batchSize}...`)

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1
      const batch = chunks.slice(i, i + batchSize)
      console.log(`[Worker] → Embedding batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`)

      try {
        const batchVectors = await Promise.all(
          batch.map(async (text, batchIdx) => {
            const embedding = await embeddings.embedQuery(text)
            return {
              id: `${internalUserId}-${job.id}-chunk-${i + batchIdx}`,
              values: embedding,
              metadata: { userId: internalUserId, fileName, text },
            }
          })
        )

        allVectors.push(...batchVectors)
        const sampleDim = batchVectors[0]?.values?.length ?? 0
        console.log(`[Worker] ✅ Batch ${batchNum}/${totalBatches} embedded — ${sampleDim}-dim vectors`)

        if (sampleDim !== EXPECTED_EMBEDDING_DIM) {
          console.error(`[Worker] ❌ Unexpected embedding dimension: got ${sampleDim}, expected ${EXPECTED_EMBEDDING_DIM}`)
        }
      } catch (embedErr: any) {
        console.error(`[Worker] ❌ Embedding batch ${batchNum}/${totalBatches} failed:`, embedErr.message)
        throw embedErr
      }
    }

    if (allVectors.length > 0) {
      console.log(`[Worker] Upserting ${allVectors.length} vectors to Pinecone index "${process.env.PINECONE_INDEX}"...`)
      try {
        await index.upsert(allVectors as any)
      } catch (e) {
        // Fallback for different pinecone sdk version shapes
        await index.upsert({ records: allVectors })
      }
      console.log(`[Worker] ✅ Upserted ${allVectors.length} vectors — user: ${userId}, file: "${fileName}"`)
    } else {
      console.warn(`[Worker] ⚠️ No vectors to upsert (file might be too short or unparseable).`)
    }
  }

  // ── Step 4: Clean up temp file ────────────────────────────────────────────
  try {
    const fs = await import('fs/promises')
    await fs.unlink(fileUrl)
    console.log(`[Worker] ✅ Temp file deleted: ${fileUrl}`)
  } catch {
    console.warn(`[Worker] ⚠️  Could not delete temp file: ${fileUrl}`)
  }

  console.log(`[Worker] ✅ Job ${job.id} complete — "${fileName}"`)
  return { success: true }
}, { connection })

// ── Worker event handlers ─────────────────────────────────────────────────────
worker.on('ready', () => {
  console.log('✅  BullMQ worker is connected to Redis and ready to process jobs')
})
worker.on('completed', job => {
  console.log(`✅  Job ${job.id} completed successfully`)
})
worker.on('failed', (job, err) => {
  console.error(`❌  Job ${job?.id} failed: ${err.message}`)
})
worker.on('error', err => {
  console.error('❌  Worker connection error (is Redis running? Check REDIS_URL):', err.message)
  console.error('    Start Redis with: docker-compose up -d')
})
