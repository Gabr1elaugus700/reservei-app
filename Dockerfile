# ======================================
# Stage 1: Dependencies
# ======================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
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

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BASE_DOMAIN
ARG NEXT_PUBLIC_ADMIN_SUBDOMAIN
ARG NEXT_PUBLIC_PUBLIC_SUBDOMAIN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN \
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

RUN apk add --no-cache tzdata libc6-compat openssl postgresql-client \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# O output standalone não traz o CLI do Prisma nem o tsx. O entrypoint
# precisa dos dois para migrate deploy, seed e o script de telefones.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/normalize-customer-phones.ts ./scripts/normalize-customer-phones.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/phone.ts ./src/lib/phone.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/counter-customer.ts ./src/lib/counter-customer.ts

COPY --chown=nextjs:nodejs entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["/app/entrypoint.sh"]
