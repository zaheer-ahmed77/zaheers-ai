import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { Queue } from 'bullmq'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ingestQueue = new Queue('file-ingest', {
  connection: { url: process.env.REDIS_URL },
})

// ── Startup Redis connectivity check ─────────────────────────────────────────
// getJobCounts() is a lightweight call that exercises the Redis connection.
// If it throws, it means Redis is unreachable — log clearly so the developer knows.
ingestQueue.getJobCounts('wait', 'active', 'failed').then((counts) => {
  console.log(
    `[Upload] ✅ BullMQ connected to Redis — queue state: wait=${counts.wait}, active=${counts.active}, failed=${counts.failed}`
  )
}).catch((err: any) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error('[Upload] ❌ BullMQ CANNOT connect to Redis:', err.message)
  console.error('[Upload]    REDIS_URL:', process.env.REDIS_URL
    ? process.env.REDIS_URL.replace(/:[^:@]+@/, ':***@')
    : 'NOT SET')
  console.error('[Upload]    ⚠️  Uploaded files will be saved but NEVER processed.')
  console.error('[Upload]    Fix: start Redis with  docker-compose up -d')
  console.error('[Upload]    Fix: make sure REDIS_URL is set correctly in server/.env')
  console.error('[Upload]    Fix: run the worker in a separate terminal: npm run worker')
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})

export const uploadRoutes = new Hono()

uploadRoutes.post('/', async (c) => {
  const auth = getAuth(c)
  if (c.req.header('X-Guest-Mode') === 'true') return c.json({ error: 'Guest mode forbidden' }, 403)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400)
    }

    const tempDir = path.join(__dirname, '../../.temp')
    await fs.mkdir(tempDir, { recursive: true })

    const filePath = path.join(tempDir, `${Date.now()}-${file.name}`)
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(arrayBuffer))

    console.log(`[Upload] File saved: ${filePath} (${file.size} bytes) for user ${auth.userId}`)

    // Add job to BullMQ — worker picks this up from Redis
    const job = await ingestQueue.add('process-file', {
      fileUrl: filePath,   // Local path passed to worker
      userId: auth.userId,
      fileName: file.name,
    })

    console.log(`[Upload] Job ${job.id} enqueued for "${file.name}" (user: ${auth.userId})`)

    return c.json({
      success: true,
      message: 'File queued for processing',
      jobId: job.id,
    })
  } catch (error: any) {
    console.error('[Upload] Error:', error.message)
    return c.json({ error: 'Failed to upload and queue file' }, 500)
  }
})

uploadRoutes.get('/status/:jobId', async (c) => {
  const auth = getAuth(c)
  if (c.req.header('X-Guest-Mode') === 'true') return c.json({ error: 'Guest mode forbidden' }, 403)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const jobId = c.req.param('jobId')
  
  try {
    const job = await ingestQueue.getJob(jobId)
    if (!job) return c.json({ error: 'Job not found' }, 404)

    const state = await job.getState()
    const progress = job.progress
    const failedReason = job.failedReason

    return c.json({
      id: job.id,
      state, // 'completed', 'failed', 'active', 'waiting', 'delayed'
      progress,
      failedReason
    })
  } catch (err: any) {
    console.error(`[Upload] Failed to fetch job status for ${jobId}:`, err.message)
    return c.json({ error: 'Failed to fetch job status' }, 500)
  }
})
