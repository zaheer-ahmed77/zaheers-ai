import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { clerkMiddleware } from '@hono/clerk-auth'
import 'dotenv/config'

import { webhookRoutes } from './routes/webhook.routes.js'
import { chatRoutes } from './routes/chat.routes.js'
import { uploadRoutes } from './routes/upload.routes.js'
import { memoryRoutes } from './routes/memory.routes.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: (origin) => {
    // Allow any localhost origin in dev, or the configured frontend URL
    if (!origin) return '*'
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return origin
    const allowedOrigin = process.env.FRONTEND_URL
    if (allowedOrigin && origin === allowedOrigin) return origin
    return origin // permissive for now — restrict in production via FRONTEND_URL
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
}))
app.use('*', clerkMiddleware())

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'Aura AI Backend', timestamp: new Date().toISOString() }))

// Routes
app.route('/api/webhook', webhookRoutes)
app.route('/api/chat', chatRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/memory', memoryRoutes)

// Global 404
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 8000
console.log(`🚀 Aura AI Server running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
