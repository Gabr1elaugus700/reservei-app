# Setup e Configuração - App Reservei

> Guia completo de setup do ambiente de desenvolvimento, configuração e deployment.

## 📋 Pré-requisitos

- **Node.js** 20+ (recomendado: 20.x LTS)
- **npm** ou **pnpm** (gerenciador de pacotes)
- **PostgreSQL** 14+ (banco de dados)
- **Git** (controle de versão)

**Opcionais** (para features avançadas):
- Redis (caching)
- RabbitMQ (message queuing)

---

## 🚀 Quick Start

### 1. Clone do Repositório

```bash
git clone <repository-url>
cd app-reservei
```

---

### 2. Instalação de Dependências

```bash
npm install
# ou
pnpm install
```

**Dependências principais**:
- `next@16.0.0` — Framework React
- `@prisma/client@6.18.0` — ORM
- `better-auth@1.3.32` — Autenticação
- `zod@4.1.12` — Validação
- `tailwindcss` — Estilização

---

### 3. Configuração de Variáveis de Ambiente

Crie arquivo `.env` na raiz:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/app_reservei"

# Auth
BETTER_AUTH_SECRET="seu-secret-aqui-64-chars-hex"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Multi-tenant (opcional)
NEXT_PUBLIC_ADMIN_SUBDOMAIN="app"
NEXT_PUBLIC_PUBLIC_SUBDOMAIN="reservas"
NEXT_PUBLIC_BASE_DOMAIN="app-reservei.com.br"

# Redis (opcional)
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"

# RabbitMQ (opcional)
RABBITMQ_URL="amqp://guest:guest@localhost"
```

**Gerar BETTER_AUTH_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 4. Setup do Banco de Dados

#### Criar Database PostgreSQL

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar database
CREATE DATABASE app_reservei;

# Sair
\q
```

#### Executar Migrations

```bash
npx prisma migrate deploy
```

**Ou para desenvolvimento** (cria migration se necessário):
```bash
npx prisma migrate dev
```

#### Seed (Dados Iniciais)

```bash
npx prisma db seed
```

**Arquivo de seed**: [prisma/seed.ts](../../prisma/seed.ts)

---

### 5. Gerar Prisma Client

```bash
npx prisma generate
```

**Necessário após**:
- ✅ Primeira instalação
- ✅ Mudanças no `schema.prisma`
- ✅ Pull de mudanças que afetam schema

---

### 6. Executar em Desenvolvimento

```bash
npm run dev
```

**Acessar**:
- Frontend: http://localhost:3000
- API: http://localhost:3000/api/*

---

## 📦 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| **dev** | `npm run dev` | Inicia servidor de desenvolvimento |
| **build** | `npm run build` | Build de produção |
| **start** | `npm run start` | Inicia servidor de produção |
| **lint** | `npm run lint` | Executa ESLint |

---

## 🗄️ Comandos Prisma Úteis

### Migrations

```bash
# Criar nova migration
npx prisma migrate dev --name nome_descritivo

# Aplicar migrations em produção
npx prisma migrate deploy

# Resetar banco (CUIDADO: deleta tudo!)
npx prisma migrate reset

# Status das migrations
npx prisma migrate status
```

### Client

```bash
# Gerar Prisma Client
npx prisma generate

# Abrir Prisma Studio (GUI do banco)
npx prisma studio
```

### Schema

```bash
# Formatar schema.prisma
npx prisma format

# Validar schema
npx prisma validate

# Pull schema do banco existente
npx prisma db pull

# Push schema sem criar migration (dev only)
npx prisma db push
```

---

## 🌍 Variáveis de Ambiente

### Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `BETTER_AUTH_SECRET` | Secret para criptografia (64 chars hex) | `a1b2c3d4...` |

### Recomendadas

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `BETTER_AUTH_URL` | URL base da aplicação | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | URL pública (client-side) | `http://localhost:3000` |
| `NODE_ENV` | Ambiente de execução | `development` |

### Opcionais (Multi-tenant)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_ADMIN_SUBDOMAIN` | Subdomínio admin | `app` |
| `NEXT_PUBLIC_PUBLIC_SUBDOMAIN` | Subdomínio público | `reservas` |
| `NEXT_PUBLIC_BASE_DOMAIN` | Domínio base | `app-reservei.com.br` |

### Opcionais (Integrações)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `REDIS_HOST` | Host do Redis | `127.0.0.1` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `RABBITMQ_URL` | URL do RabbitMQ | `amqp://guest:guest@localhost` |

---

## 🐳 Docker (Opcional)

### Docker Compose para Dev

**Arquivo**: `docker-compose.dev.yml`

```bash
# Subir PostgreSQL + Redis + RabbitMQ
docker-compose -f docker-compose.dev.yml up -d

# Verificar status
docker-compose -f docker-compose.dev.yml ps

# Parar
docker-compose -f docker-compose.dev.yml down
```

**Services incluídos**:
- PostgreSQL na porta 5432
- Redis na porta 6379
- RabbitMQ na porta 5672 (admin: 15672)

---

### Docker para Produção

**Arquivo**: `docker-compose.yml`

```bash
# Build e subir aplicação
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

**Ver também**: [DOCKER_DEPLOY.md](../../DOCKER_DEPLOY.md), [deploy.sh](../../deploy.sh)

---

## 📤 Deployment

### Build de Produção

```bash
# 1. Instalar dependências
npm ci

# 2. Gerar Prisma Client
npx prisma generate

# 3. Executar migrations
npx prisma migrate deploy

# 4. Build Next.js
npm run build

# 5. Iniciar servidor
npm start
```

---

### Variáveis de Ambiente em Produção

**✅ OBRIGATÓRIO**:
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
BETTER_AUTH_SECRET="production-secret-64-chars"
BETTER_AUTH_URL="https://app.app-reservei.com.br"
NEXT_PUBLIC_APP_URL="https://app.app-reservei.com.br"
```

**⚠️ IMPORTANTE**:
- Use `DATABASE_URL` com SSL em produção: `?sslmode=require`
- Gere novo `BETTER_AUTH_SECRET` para produção (NUNCA reutilizar dev)
- Configure `BETTER_AUTH_URL` com domínio real (HTTPS)

---

### Plataformas de Deploy

#### Vercel (Recomendado para Next.js)

1. Conecte repositório no Vercel
2. Configure variáveis de ambiente
3. Deploy automático em push

**Database**: Use Vercel Postgres ou outro provider PostgreSQL

---

#### Docker + VPS

1. Suba `docker-compose.yml` no servidor
2. Configure DNS para apontar para IP do servidor
3. Certifique-se de ter SSL (Let's Encrypt + Traefik)

**Ver**: [DOCKER_DEPLOY.md](../../DOCKER_DEPLOY.md)

---

#### Outras Plataformas

- **Railway**: Suporta PostgreSQL + Next.js
- **Render**: Build automático de Docker
- **Fly.io**: Deploy de containers

---

## 🔧 Troubleshooting

### Erro: "Prisma Client not generated"

```bash
# Solução
npx prisma generate
```

---

### Erro: "Can't reach database server"

**Verificar**:
1. PostgreSQL está rodando? `sudo service postgresql status`
2. `DATABASE_URL` correto no `.env`?
3. Firewall bloqueando porta 5432?

**Teste de conexão**:
```bash
psql "$DATABASE_URL"
```

---

### Erro: "P2002 Unique constraint failed"

**Causa**: Tentativa de inserir dado duplicado (email, phone, etc.)

**Solução**: 
- Verificar dados antes de insert
- Tratar erro 409 na API

---

### Build falha com "Type errors"

```bash
# Verificar tipos
npx tsc --noEmit

# Corrigir erros reportados
```

---

### Porta 3000 já em uso

```bash
# Matar processo na porta 3000
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Ou usar porta diferente
PORT=3001 npm run dev
```

---

## 📚 Estrutura do Projeto

```
app-reservei/
├── .github/
│   └── copilot-instructions.md  # Instruções para GitHub Copilot
├── docs/
│   ├── technical/               # Esta documentação
│   │   ├── README.md
│   │   ├── DATABASE.md
│   │   ├── BOOKING_SYSTEM.md
│   │   ├── API_REFERENCE.md
│   │   ├── FRONTEND.md
│   │   ├── AUTHENTICATION.md
│   │   ├── DEVELOPMENT_PATTERNS.md
│   │   └── SETUP.md
│   ├── HOOKS_ARCHITECTURE.md
│   ├── SCHEDULE_SYSTEM.md
│   └── ...
├── prisma/
│   ├── schema.prisma            # Schema do banco
│   ├── seed.ts                  # Dados iniciais
│   └── migrations/              # Histórico de migrations
├── public/                      # Assets estáticos
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API Routes
│   │   ├── auth/                # Páginas de autenticação
│   │   ├── contexts/            # React Contexts
│   │   ├── features/            # Features por domínio
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              # Componentes React
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── BookingCalendar.tsx
│   │   ├── NewBookingForm.tsx
│   │   └── TimeSlot.tsx
│   ├── hooks/                   # Custom React Hooks
│   │   ├── bookingsHook.ts
│   │   ├── use-capacity-management.ts
│   │   └── use-timeslots.ts
│   ├── lib/                     # Utilitários e Services
│   │   ├── auth.ts
│   │   ├── auth-client.ts
│   │   ├── auth-service.ts
│   │   ├── prisma.ts
│   │   ├── timeslot-service.ts
│   │   ├── capacity-service.ts
│   │   └── validations/
│   ├── middleware.ts            # Next.js Middleware
│   └── worker/                  # Background workers
├── .env                         # Variáveis de ambiente (não commitado)
├── .env.example                 # Template de .env
├── docker-compose.yml           # Docker production
├── docker-compose.dev.yml       # Docker development
├── Dockerfile                   # Container da aplicação
├── package.json                 # Dependencies e scripts
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind config
└── next.config.ts               # Next.js config
```

---

## 🧪 Testing (Planejado)

**Atualmente**: Sem testes automatizados configurados.

**Frameworks recomendados**:
- **Jest** + **React Testing Library** — Unit/Integration tests
- **Playwright** ou **Cypress** — E2E tests
- **Vitest** — Alternativa moderna ao Jest

**Ver**: [TESTING_GUIDE.md](../../docs/TESTING_GUIDE.md) (documentação existente)

---

## 🔗 Referências Relacionadas

- **Arquitetura**: [README.md](./README.md) — Índice da documentação técnica
- **Banco de Dados**: [DATABASE.md](./DATABASE.md) — Setup de schema e migrations
- **Autenticação**: [AUTHENTICATION.md](./AUTHENTICATION.md) — Configuração de auth
- **Padrões**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) — Convenções de código

---

## 📖 Documentação de Dependências

- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **better-auth**: https://www.better-auth.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Zod**: https://zod.dev

---

## 🆘 Suporte e Recursos

### Arquivos de Deploy na Raiz

- [DEPLOY_PRODUCTION.md](../../DEPLOY_PRODUCTION.md) — Guia de deploy em produção
- [DEPLOY_TIMEZONE_FIX.md](../../DEPLOY_TIMEZONE_FIX.md) — Correções de timezone
- [DOCKER_DEPLOY.md](../../DOCKER_DEPLOY.md) — Deploy com Docker
- [DNS_CONFIG.md](../../DNS_CONFIG.md) — Configuração de DNS
- [SUBDOMAIN_SETUP.md](../../SUBDOMAIN_SETUP.md) — Setup de subdomínios
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) — Debugging e troubleshooting

### Scripts Shell

- [deploy.sh](../../deploy.sh) — Script de deploy automatizado
- [check-db.sh](../../check-db.sh) — Verificação do banco
- [check-db-config.sh](../../check-db-config.sh) — Diagnóstico de config
- [view-logs.sh](../../view-logs.sh) — Visualizar logs

---

**Última atualização**: 9 de abril de 2026
