# Build stages run on native platform (no QEMU emulation)
FROM --platform=$BUILDPLATFORM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client with amd64 Alpine engine for cross-platform build
RUN sed -i '/provider = "prisma-client-js"/a\  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]' prisma/schema.prisma
RUN npx prisma generate

# NEXT_PUBLIC_* vars are inlined at build time — must be set before next build
ENV NEXT_PUBLIC_AUTH_ENABLED=true

# Build Next.js (standalone output)
RUN npm run build

# --- Runner (target platform: linux/amd64) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone server (JS is platform-independent)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma config + schema (needed by init container for db push)
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma ./prisma

# Copy all node_modules for Prisma CLI + its many transitive deps (init container runs db push)
# JS deps are platform-independent; only .prisma engine is platform-specific
COPY --from=deps /app/node_modules ./node_modules
# Overwrite with amd64 Alpine Prisma engine
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Fix ownership so nextjs user can run prisma db push (init container)
RUN chown -R nextjs:nodejs node_modules/.prisma node_modules/@prisma node_modules/prisma prisma prisma.config.ts

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
