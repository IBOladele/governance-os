// lib/prisma.ts
// Prisma 7 client singleton using the pg driver adapter.
// Safe for Next.js hot-reload — reuses the Pool and PrismaClient across HMR cycles.

import { PrismaClient }  from '@prisma/client';
import { PrismaPg }      from '@prisma/adapter-pg';
import { Pool }          from 'pg';

const globalForPrisma = globalThis as unknown as {
  pool?:   Pool;
  prisma?: PrismaClient;
};

// Reuse the connection pool across hot-reloads in dev
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL!,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
