FROM oven/bun:1.2.19-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile
RUN bun prisma generate

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/dist ./dist
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/node_modules/.prisma/client  ./node_modules/.prisma/client
COPY --from=builder /app/prisma ./prisma

EXPOSE 3010
CMD ["bun", "dist/main.js"]
