# ======================================
# Stage 1: Dependencies
# ======================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# ======================================
# Stage 2: Builder
# ======================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ARG NEXT_PUBLIC_BASE_DOMAIN
ARG NEXT_PUBLIC_ADMIN_SUBDOMAIN
ARG NEXT_PUBLIC_PUBLIC_SUBDOMAIN
ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN \
    NEXT_PUBLIC_ADMIN_SUBDOMAIN=$NEXT_PUBLIC_ADMIN_SUBDOMAIN \
    NEXT_PUBLIC_PUBLIC_SUBDOMAIN=$NEXT_PUBLIC_PUBLIC_SUBDOMAIN

RUN npm run build

# ======================================
# Stage 3: Runner
# ======================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

RUN apk add --no-cache tzdata
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copiar arquivos do Prisma (necessário para migrations)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules ./node_modules

# standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["/app/entrypoint.sh"]
