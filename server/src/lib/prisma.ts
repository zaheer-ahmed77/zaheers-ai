import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
import type { PrismaClient as PrismaClientType } from '@prisma/client'

// Singleton pattern: prevents multiple PrismaClient instances during hot-reload (tsx watch)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }) as PrismaClientType

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
