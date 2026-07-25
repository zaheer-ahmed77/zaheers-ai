import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getAuth } from '@hono/clerk-auth'
import { prisma } from '../lib/prisma.js'

import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatGroq } from '@langchain/groq'
import { ChatOpenAI } from '@langchain/openai'
import { createToolCallingAgent, AgentExecutor } from "langchain/agents"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages"
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

import { timeTool } from '../tools/time.tools.js'
import { weatherTool } from '../tools/weather.tools.js'
import { internetSearchTool } from '../tools/internetSearch.tools.js'
import { createRagSearchTool } from '../tools/ragSearch.tools.js'
import { createReadFullDocumentTool } from '../tools/read_full_document.tools.js'
import { createSaveMemoryTool, createQueryMemoryTool, createDeleteMemoryTool } from '../tools/memory.tools.js'

export const chatRoutes = new Hono()

const ALLOWED_MODELS = ['llama-3.3-70b-versatile', 'gemini-1.5-flash']

const getModel = (modelName: string) => {
  if (modelName === 'llama-3.3-70b-versatile' && process.env.GROQ_API_KEY) {
    return new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0.7,
    })
  }
  // Default to Gemini Flash
  return new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  })
}

chatRoutes.get('/history', async (c) => {
  const auth = getAuth(c)
  const isGuest = c.req.header('X-Guest-Mode') === 'true'
  
  if (isGuest) return c.json({ history: [] })
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } })
    if (!user) return c.json({ history: [] })

    const chats = await prisma.chat.findMany({
      where: { userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return c.json({ history: chats })
  } catch (err: any) {
    console.error('History fetch error:', err)
    return c.json({ error: 'Failed to fetch history' }, 500)
  }
})

chatRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c)
  const isGuest = c.req.header('X-Guest-Mode') === 'true'
  
  if (isGuest) return c.json({ success: true })
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const chatId = c.req.param('id')

  try {
    const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } })
    if (!user) return c.json({ error: 'User not found' }, 404)

    const chat = await prisma.chat.findUnique({ where: { id: chatId } })
    if (!chat || chat.userId !== user.id) {
      return c.json({ error: 'Chat not found or forbidden' }, 403)
    }

    // Delete messages first (cascade not configured in schema)
    await prisma.message.deleteMany({ where: { chatId } })
    await prisma.chat.delete({ where: { id: chatId } })

    return c.json({ success: true })
  } catch (err: any) {
    console.error('Chat delete error:', err)
    return c.json({ error: 'Failed to delete chat' }, 500)
  }
})

chatRoutes.post('/', async (c) => {
  const auth = getAuth(c)
  const isGuest = c.req.header('X-Guest-Mode') === 'true'
  
  if (!auth?.userId && !isGuest) return c.json({ error: 'Unauthorized' }, 401)

  let body: { text?: string; chatId?: string; model?: string; imageBase64?: string; chatHistory?: any[] }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { text, chatId, model: requestedModel, imageBase64, chatHistory: clientChatHistory } = body
  if (!text || typeof text !== 'string' || !text.trim()) {
    return c.json({ error: 'Message text is required' }, 400)
  }

  // If there's an image, Groq won't support it well, force Gemini Flash
  const modelName = imageBase64 
    ? 'gemini-1.5-flash' 
    : (ALLOWED_MODELS.includes(requestedModel ?? '') ? requestedModel! : 'gemini-1.5-flash')

  let user = null;
  let chat = null;
  
  if (!isGuest && auth?.userId) {
    user = await prisma.user.findUnique({ where: { clerkId: auth.userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: auth.userId, email: `${auth.userId}@placeholder.com` }
      })
    }

    chat = chatId ? await prisma.chat.findUnique({ where: { id: chatId } }) : null
    if (!chat) {
      chat = await prisma.chat.create({
        data: { userId: user.id, title: text.trim().substring(0, 60) }
      })
    } else {
      await prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })
    }
    
    const dbContent = imageBase64 ? `${text.trim()}\n\n![Attached Image](${imageBase64})` : text.trim()
    await prisma.message.create({
      data: { chatId: chat.id, role: 'user', content: dbContent }
    })
  }

  let chatHistory: BaseMessage[] = []
  
  if (isGuest) {
    if (clientChatHistory && Array.isArray(clientChatHistory)) {
      // Omit the very last message if it's the current one we are processing, to avoid duplication
      const historyToUse = clientChatHistory.slice(0, -1);
      chatHistory = historyToUse.map(msg => {
        if (msg.role === 'user') {
          const cleanContent = (msg.text || '').replace(/!\[.*?\]\(data:image\/.*?\)/g, '[Image attached previously]').trim()
          return new HumanMessage(cleanContent)
        }
        return new AIMessage(msg.text || '')
      })
    }
  } else if (chat) {
    const previousMessages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
    
    chatHistory = previousMessages.map(msg => {
      // Exclude the message we just created above
      if (msg.role === 'user') {
        const cleanContent = msg.content.replace(/!\[.*?\]\(data:image\/.*?\)/g, '[Image attached previously]').trim()
        return new HumanMessage(cleanContent)
      }
      return new AIMessage(msg.content)
    })
    // Remove the last message from history since LangChain will receive it as `input`
    chatHistory.pop()
  }

  return streamSSE(c, async (stream) => {
    try {
      const llm = getModel(modelName)
      let tools: any[] = [
        timeTool,
        weatherTool,
        internetSearchTool,
      ]
      
      if (!isGuest && user) {
        tools.push(
          createRagSearchTool(user.id),
          createReadFullDocumentTool(user.id),
          createSaveMemoryTool(user.id),
          createQueryMemoryTool(user.id),
          createDeleteMemoryTool(user.id)
        )
      }

      const currentDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const systemPrompt = `You are Zaheer's AI, a highly intelligent, fully-capable, and personalized general-purpose AI agent. You have access to tools and you MUST use them.
TODAY'S DATE IS: ${currentDate}. You must answer questions with the awareness that we are in this year.

CRITICAL RULES — NEVER BREAK THESE:
1. YOU ARE A GENERAL-PURPOSE AI ASSISTANT. YOU MUST SOLVE MATH PROBLEMS, EXPLAIN DIAGRAMS, SOLVE EXAM QUESTIONS, TRANSLATE TEXT, REWRITE CONTENT, AND PERFORM ANY TASK THE USER ASKS. DO NOT REFUSE TO SOLVE ACADEMIC QUESTIONS OR PAST PAPERS. YOU ARE BUILT TO HELP WITH STUDYING AND SOLVING PROBLEMS.
2. ALWAYS use "internet_search" for ANY question about: people, places, events, sports, politics, news, science, history, definitions, or ANY factual topic. NEVER answer such questions from your own training data — it may be outdated or wrong.
3. ALWAYS use "read_full_document" when the user asks for a summary, an overview, contact details, or holistic understanding of an uploaded document.
4. ALWAYS use "document_rag_search" when the user asks specific, highly detailed factual questions about large uploaded documents.
5. ALWAYS use "get_weather" for weather questions.
6. ALWAYS use "get_current_time" for exact time questions.
7. ALWAYS use "save_memory" when the user explicitly asks you to remember something about themselves (e.g. "my favorite color is blue", "I am a developer").
8. ALWAYS use "query_memory" to retrieve the user's stored preferences or past facts whenever the context suggests it might be helpful (e.g., "What is my name?", "What did I tell you about my job?").
9. YOU ARE FULLY CAPABLE OF WRITING CODE. If the user asks for code (e.g. Python, JS), write it directly in your response using markdown blocks. Do not say you cannot execute it, just provide the code.

YOU ARE FORBIDDEN FROM:
- Refusing to answer academic, educational, or problem-solving questions.
- Refusing to analyze or solve images provided in the chat.
- Answering factual questions (who is X, what is Y, latest Z) without searching first.
- Refusing to search because you "think you know" the answer.
- Giving generic responses when a tool could provide accurate data.

SEARCH STRATEGY:
- For people (politicians, celebrities, sportsmen): search "[name] biography" or "[name] career"
- For current events: search the specific topic with year (e.g., "Prime Minister Pakistan 2025")
- For document content: Use read_full_document for summaries/general details. Use document_rag_search for deep keyword-based searches.

TOOLS AVAILABLE:
- internet_search: Search Wikipedia + Tavily for real-time, accurate information
- read_full_document: Read the ENTIRE content of an uploaded document (Best for summaries, overviews, extracting names/emails)
- document_rag_search: Search user's uploaded documents for specific keywords
- get_weather: Real-time weather data
- get_current_time: Current date and time
- save_memory: Permanently remember user preferences/facts
- query_memory: Retrieve all stored preferences/facts about the user
- delete_memory: Delete a stored preference/fact`

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        new MessagesPlaceholder("chat_history"),
        new MessagesPlaceholder("input"),
        new MessagesPlaceholder("agent_scratchpad"),
      ])

      const agent = createToolCallingAgent({ llm, tools, prompt })
      const agentExecutor = new AgentExecutor({ agent, tools, maxIterations: 5, returnIntermediateSteps: false })

      let aiResponseText = ""

      // Send the chatId first so the client can track the session
      if (chat) {
        await stream.writeSSE({ data: `[System: ChatId=${chat.id}]\\n` })
      } else if (isGuest) {
        await stream.writeSSE({ data: `[System: ChatId=guest-session-${Date.now()}]\\n` })
      }

      let userMessageContent: any = text.trim();
      if (imageBase64) {
        const parts: any[] = [];
        if (text.trim()) {
          parts.push({ type: 'text', text: text.trim() });
        } else {
          parts.push({ type: 'text', text: "What is in this image?" }); // Fallback if no text provided
        }
        parts.push({ type: 'image_url', image_url: { url: imageBase64 } });
        userMessageContent = parts;
      }

      const userMessage = new HumanMessage({
        content: userMessageContent
      });

      try {
        const eventStream = await agentExecutor.streamEvents(
          { input: [userMessage], chat_history: chatHistory },
          { version: "v2" }
        )

        for await (const event of eventStream) {
          // Stream text tokens from the final LLM response
          if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk?.content
            if (chunk && typeof chunk === 'string') {
              aiResponseText += chunk
              await stream.writeSSE({ data: chunk.replace(/\n/g, '\\n') })
            }
          }

          // Notify the client when a tool is being invoked
          if (event.event === "on_tool_start") {
            const toolName = event.name ?? 'tool'
            const toolInput = event.data?.input?.query || event.data?.input?.location || ''
            const thinkingMsg = `[THINKING: Using ${toolName}${toolInput ? ` for "${toolInput}"` : ''}]`
            await stream.writeSSE({ event: 'thinking', data: thinkingMsg })
          }
        }
      } catch (agentErr: any) {
        console.error('[Agent Error]:', agentErr)
        const errMsg = `I encountered an error while processing that request: ${agentErr?.message || 'Unknown Agent Error'}`;
        aiResponseText += `\n\n[Error: ${errMsg}]`
        await stream.writeSSE({ data: `\\n\\n${errMsg}` })
      }

      // Save AI response to DB
      if (!isGuest && chat) {
        await prisma.message.create({
          data: {
            chatId: chat.id,
            role: 'ai',
            content: aiResponseText.trim() || "I've completed the requested action."
          }
        })
      }

    } catch (err: any) {
      console.error('Agent Error:', err)
      const errMsg = err.message?.includes('API key') ? 'LLM API key is missing or invalid.' : `An error occurred: ${err.message}`
      await stream.writeSSE({ data: errMsg.replace(/\n/g, '\\n') })
    } finally {
      await stream.close()
    }
  })
})
