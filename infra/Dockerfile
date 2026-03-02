FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

# ─── Dependencies ────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY imob-ro/package.json imob-ro/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false --ignore-scripts

# ─── Builder ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY imob-ro/ .

RUN pnpm prisma generate
RUN pnpm next build

# ─── Runner ──────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

RUN npm install -g prisma@6.17.1

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
