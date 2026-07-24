import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Score threshold: lower = more results but less relevant; higher = more precise but may miss things.
// Default 0.5 works well for standard-length documents.
// For short documents (e.g. single-page notes), try 0.3 by setting RAG_SCORE_THRESHOLD=0.3 in .env
const RAG_SCORE_THRESHOLD = process.env.RAG_SCORE_THRESHOLD
  ? parseFloat(process.env.RAG_SCORE_THRESHOLD)
  : 0.5

export const createRagSearchTool = (userId: string) => tool(
  async ({ query }) => {
    console.log(`[Tool] document_rag_search called — user: ${userId}, query: "${query}"`)
    console.log(`[RAG] Score threshold: ${RAG_SCORE_THRESHOLD} (configurable via RAG_SCORE_THRESHOLD env var)`)

    // Require Pinecone + Gemini keys
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX || !process.env.GEMINI_API_KEY) {
      const missing: string[] = []
      if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
      if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
      if (!process.env.GEMINI_API_KEY)   missing.push('GEMINI_API_KEY')
      console.warn(`[RAG] Missing env vars: ${missing.join(', ')} — document search is unavailable`)
      return `Document search is not configured. Missing environment variables: ${missing.join(', ')}.`
    }

    try {
      const { Pinecone } = await import('@pinecone-database/pinecone')
      const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai')

      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
      const index = pc.index(process.env.PINECONE_INDEX!)

      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY!,
        model: 'gemini-embedding-001',  // Must match the model used in worker/index.ts
      })

      console.log(`[RAG] Embedding query for Pinecone...`)
      const queryEmbedding = await embeddings.embedQuery(query)
      console.log(`[RAG] Query embedded (${queryEmbedding.length}-dim). Querying Pinecone (top-5, userId filter)...`)

      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        filter: { userId: { $eq: userId } },  // Strict per-user isolation
        includeMetadata: true,
      })

      const totalMatches = queryResponse.matches?.length ?? 0
      console.log(`[RAG] Pinecone returned ${totalMatches} match(es) for userId="${userId}"`)

      if (totalMatches === 0) {
        console.log(`[RAG] No matches found — user may not have uploaded any documents yet`)
        return (
          `No relevant information found in your uploaded documents for: "${query}". ` +
          `You may not have uploaded any documents yet, or the RAG worker may still be processing your file.`
        )
      }

      // Log all match scores before filtering so threshold issues are visible
      queryResponse.matches!.forEach((m, i) => {
        console.log(`[RAG] Match ${i + 1}: score=${m.score?.toFixed(4)}, file="${m.metadata?.fileName}"`)
      })

      const aboveThreshold = queryResponse.matches!.filter(
        m => m.score !== undefined && m.score > RAG_SCORE_THRESHOLD
      )

      console.log(
        `[RAG] ${aboveThreshold.length}/${totalMatches} match(es) above threshold (>${RAG_SCORE_THRESHOLD})`
      )

      if (aboveThreshold.length === 0) {
        return (
          `Found ${totalMatches} document match(es) but all had relevance scores at or below ${RAG_SCORE_THRESHOLD}. ` +
          `Try rephrasing your query, or lower RAG_SCORE_THRESHOLD in your .env if your documents are short.`
        )
      }

      const context = aboveThreshold
        .map((m, i) => {
          const text = (m.metadata?.text as string) || ''
          const fileName = (m.metadata?.fileName as string) || 'unknown file'
          const score = ((m.score ?? 0) * 100).toFixed(0)
          return `[Document ${i + 1} from "${fileName}" (relevance: ${score}%)]\n${text}`
        })
        .join('\n\n---\n\n')

      console.log(`[RAG] Returning ${aboveThreshold.length} relevant chunk(s)`)
      return `Here is relevant context from your uploaded documents:\n\n${context}`
    } catch (e: any) {
      console.error('[RAG] document_rag_search failed:', e)
      return `Document search failed: ${e.message}`
    }
  },
  {
    name: 'document_rag_search',
    description:
      'Search the user\'s uploaded personal documents and files for specific information, facts, or context. Use this when the user asks about content from their uploaded files.',
    schema: z.object({
      query: z.string().describe('The specific query to search for within the user\'s uploaded documents.'),
    }),
  }
)
