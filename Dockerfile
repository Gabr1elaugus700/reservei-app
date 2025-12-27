# ======================================
# Stage 1: Dependencies
# ======================================
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# ======================================
# Stage 2: Builder
# ======================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gerar o Prisma Client
RUN npx prisma generate

# Build da aplicação Next.js
# As variáveis NEXT_PUBLIC_* precisam estar disponíveis em build time
ARG NEXT_PUBLIC_BASE_DOMAIN
ARG NEXT_PUBLIC_ADMIN_SUBDOMAIN
ARG NEXT_PUBLIC_PUBLIC_SUBDOMAIN

ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN
ENV NEXT_PUBLIC_ADMIN_SUBDOMAIN=$NEXT_PUBLIC_ADMIN_SUBDOMAIN
ENV NEXT_PUBLIC_PUBLIC_SUBDOMAIN=$NEXT_PUBLIC_PUBLIC_SUBDOMAIN

RUN npm run build

# ======================================
# Stage 3: Runner (Produção)
# ======================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Copiar build do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
