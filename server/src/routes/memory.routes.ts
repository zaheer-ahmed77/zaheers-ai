import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { prisma } from '../lib/prisma.js'

export const memoryRoutes = new Hono()

// Get all memories for user
memoryRoutes.get('/', async (c) => {
  const auth = getAuth(c)
  if (c.req.header('X-Guest-Mode') === 'true') return c.json({ error: 'Guest mode forbidden' }, 403)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } })
  if (!user) return c.json({ error: 'User not found' }, 404)
  
  const memories = await prisma.userMemory.findMany({ where: { userId: user.id } })
  return c.json({ memories })
})

// Create a new memory
memoryRoutes.post('/', async (c) => {
  const auth = getAuth(c)
  if (c.req.header('X-Guest-Mode') === 'true') return c.json({ error: 'Guest mode forbidden' }, 403)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const { key, value } = await c.req.json()
  if (!key || !value) return c.json({ error: 'Key and value required' }, 400)

  const user = await prisma.user.findUnique({ where: { clerkId: auth.userId } })
  if (!user) return c.json({ error: 'User not found' }, 404)
  
  const memory = await prisma.userMemory.upsert({
    where: { userId_key: { userId: user.id, key } },
    update: { value },
    create: { userId: user.id, key, value },
  })
  
  return c.json({ memory })
})

// Delete a memory
memoryRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (c.req.header('X-Guest-Mode') === 'true') return c.json({ error: 'Guest mode forbidden' }, 403)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = c.req.param('id')
  
  // Verify ownership
  const memory = await prisma.userMemory.findUnique({ where: { id }, include: { user: true } })
  if (!memory || memory.user.clerkId !== auth.userId) {
    return c.json({ error: 'Memory not found or forbidden' }, 403)
  }
  
  await prisma.userMemory.delete({ where: { id } })
  return c.json({ success: true })
})
