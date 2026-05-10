// prisma.config.ts
// Prisma 7 — database connection config lives here, not in schema.prisma
// Docs: https://pris.ly/d/config-datasource

import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

// Explicitly load .env so DATABASE_URL is available when Prisma reads this file
loadEnv({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  // datasource.url is read by the Prisma CLI (migrate, studio, introspect)
  datasource: {
    url: process.env.DATABASE_URL,
  },

  // migrations.seed is the command Prisma CLI runs for `prisma db seed`
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
