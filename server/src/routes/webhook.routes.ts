import { Hono } from 'hono'
import { Webhook } from 'svix'
import { prisma } from '../lib/prisma.js'

export const webhookRoutes = new Hono()

webhookRoutes.post('/', async (c) => {
  const payload = await c.req.text()
  const headers = c.req.header()
  
  // NOTE: You need to set CLERK_WEBHOOK_SECRET in .env for production verification
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (secret) {
    const wh = new Webhook(secret)
    try {
      wh.verify(payload, {
        "svix-id": headers['svix-id'] as string,
        "svix-timestamp": headers['svix-timestamp'] as string,
        "svix-signature": headers['svix-signature'] as string,
      })
    } catch (err) {
      console.error('Error verifying webhook', err)
      return c.json({ error: 'Invalid signature' }, 400)
    }
  }

  const evt = JSON.parse(payload)
  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses?.[0]?.email_address || 'no-email'
    const name = `${first_name || ''} ${last_name || ''}`.trim()
    
    await prisma.user.upsert({
      where: { clerkId: id },
      update: { email, name },
      create: { clerkId: id, email, name },
    })
    console.log(`Synced user ${id} to DB`)
  }
  
  return c.json({ success: true })
})
