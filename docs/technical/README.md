# Documentação Técnica - App Reservei

> Documentação técnica completa para desenvolvedores e assistentes de IA trabalharem eficientemente no sistema de reservas.

## 📚 Visão Geral

O **App Reservei** é um sistema de gerenciamento de reservas e agendamentos desenvolvido em Next.js 16 com TypeScript, utilizando PostgreSQL via Prisma ORM e autenticação via better-auth.

### Stack Tecnológico Principal

- **Framework**: Next.js 16 (App Router)
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: better-auth com suporte a multi-tenancy
- **UI**: Tailwind CSS + shadcn/ui components
- **Validação**: Zod schemas
- **Cache Client-Side**: localStorage com TTL

---

## 📖 Guias de Documentação

### Arquitetura e Dados
- **[DATABASE.md](./DATABASE.md)** — Modelos Prisma, relacionamentos, diagrama ER e decisões de design
- **[BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md)** — Sistema completo de agendamento: configuração → slots → reservas

### Referências de API e Frontend
- **[API_REFERENCE.md](./API_REFERENCE.md)** — Todos os endpoints com payloads, respostas e validações
- **[FRONTEND.md](./FRONTEND.md)** — Estrutura de componentes, hooks e fluxo de estado

### Autenticação e Padrões
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** — Sistema de autenticação, proteção de rotas e multi-tenancy
- **[DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md)** — Convenções de código e padrões arquiteturais

### Setup e Deploy
- **[SETUP.md](./SETUP.md)** — Configuração de ambiente, variáveis e instruções de deployment

---

## 🚀 Início Rápido

### Para Desenvolvedores

1. **Entender a arquitetura de dados**: Comece com [DATABASE.md](./DATABASE.md)
2. **Entender o sistema central**: Leia [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) para compreender o fluxo de agendamento
3. **Explorar APIs**: Use [API_REFERENCE.md](./API_REFERENCE.md) para entender os endpoints disponíveis
4. **Desenvolver UI**: Consulte [FRONTEND.md](./FRONTEND.md) para padrões de componentes e hooks

### Para IAs Assistentes

Ao receber uma solicitação para modificar/adicionar funcionalidade:

1. **Identificar área**: Determine se envolve API, UI, banco de dados ou lógica de negócio
2. **Consultar padrões**: Leia [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) para seguir convenções existentes
3. **Verificar modelos**: Consulte [DATABASE.md](./DATABASE.md) se precisar modificar schema
4. **Validar autenticação**: Se envolve dados protegidos, veja [AUTHENTICATION.md](./AUTHENTICATION.md)
5. **Seguir exemplos**: Use [API_REFERENCE.md](./API_REFERENCE.md) e [FRONTEND.md](./FRONTEND.md) como referência

---

## 🔍 Onde Encontrar o Quê

### Sistema de Reservas (Core Business)
- **Conceitos**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md)
- **Modelos DB**: `Customer`, `Booking`, `TimeSlot`, `AvailabilityConfig` em [DATABASE.md](./DATABASE.md)
- **APIs**: Seção "Bookings" e "TimeSlots" em [API_REFERENCE.md](./API_REFERENCE.md)
- **Hooks**: `useBookings`, `useTimeSlots` em [FRONTEND.md](./FRONTEND.md)

### Configuração de Horários e Capacidade
- **Conceitos**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) — Seção "Geração de Slots"
- **Modelos DB**: `AvailabilityConfig`, `TimeSlot` em [DATABASE.md](./DATABASE.md)
- **APIs**: Seção "Availability Configs" em [API_REFERENCE.md](./API_REFERENCE.md)
- **Hooks**: `useAvailabilitySchedule` em [FRONTEND.md](./FRONTEND.md)

### Autenticação e Autorização
- **Conceitos**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Modelos DB**: `User`, `Session`, `Account`, `Organization` em [DATABASE.md](./DATABASE.md)
- **APIs**: Seção "Auth" em [API_REFERENCE.md](./API_REFERENCE.md)
- **Middleware**: [AUTHENTICATION.md](./AUTHENTICATION.md) — Seção "Proteção de Rotas"

### Clientes/Usuários do Sistema
- **Conceitos**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) — Seção "Fluxo de Reserva"
- **Modelos DB**: `Customer` em [DATABASE.md](./DATABASE.md)
- **APIs**: Seção "Customers" em [API_REFERENCE.md](./API_REFERENCE.md)

### UI e Componentes
- **Arquitetura**: [FRONTEND.md](./FRONTEND.md)
- **Padrões**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) — Seção "Componentes e Hooks"

### Deploy e Configuração
- **Setup Dev**: [SETUP.md](./SETUP.md)
- **Variáveis de Ambiente**: [SETUP.md](./SETUP.md) — Seção "Environment Variables"
- **Deploy Produção**: [SETUP.md](./SETUP.md) + arquivos `/DEPLOY_*.md` na raiz

---

## 📐 Arquitetura em Alto Nível

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App Router                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐      ┌──────────────┐           │
│  │   Frontend   │◄────►│  API Routes  │           │
│  │  (React UI)  │      │  (/api/*)    │           │
│  └──────────────┘      └──────┬───────┘           │
│         │                      │                    │
│         │                      ▼                    │
│    ┌────▼──────┐      ┌──────────────┐            │
│    │   Hooks   │      │   Services   │            │
│    │ (Client)  │      │  (Server)    │            │
│    └───────────┘      └──────┬───────┘            │
│                               │                     │
│                               ▼                     │
│                      ┌──────────────┐              │
│                      │    Prisma    │              │
│                      │     ORM      │              │
│                      └──────┬───────┘              │
│                               │                     │
├───────────────────────────────┼─────────────────────┤
│                               ▼                     │
│                      ┌──────────────┐              │
│                      │  PostgreSQL  │              │
│                      │   Database   │              │
│                      └──────────────┘              │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Conceitos-Chave Indexados

| Conceito | Onde Encontrar |
|----------|----------------|
| Agendamento/Reserva | [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) |
| API Endpoints | [API_REFERENCE.md](./API_REFERENCE.md) |
| Autenticação | [AUTHENTICATION.md](./AUTHENTICATION.md) |
| AvailabilityConfig | [DATABASE.md](./DATABASE.md), [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) |
| Booking (Reserva) | [DATABASE.md](./DATABASE.md), [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) |
| Capacidade de Slots | [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) |
| Cliente (Customer) | [DATABASE.md](./DATABASE.md), [API_REFERENCE.md](./API_REFERENCE.md) |
| Componentes UI | [FRONTEND.md](./FRONTEND.md) |
| Configuração de Horários | [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) |
| Hooks React | [FRONTEND.md](./FRONTEND.md) |
| Middleware | [AUTHENTICATION.md](./AUTHENTICATION.md) |
| Multi-tenancy | [AUTHENTICATION.md](./AUTHENTICATION.md) |
| Padrões de Código | [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) |
| Prisma Schema | [DATABASE.md](./DATABASE.md) |
| Proteção de Rotas | [AUTHENTICATION.md](./AUTHENTICATION.md) |
| Services (Camada de serviço) | [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) |
| TimeSlot | [DATABASE.md](./DATABASE.md), [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) |
| Transações | [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) |
| Validação Zod | [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) |
| Variáveis de Ambiente | [SETUP.md](./SETUP.md) |

---

## 🔄 Atualizações e Manutenção

Esta documentação deve ser atualizada quando:
- ✅ Novos modelos são adicionados ao schema Prisma
- ✅ Novos endpoints de API são criados
- ✅ Novos hooks ou componentes principais são implementados
- ✅ Padrões arquiteturais são estabelecidos ou modificados
- ✅ Sistema de autenticação é alterado
- ✅ Variáveis de ambiente são adicionadas

---

## 📝 Estilo de Documentação

Esta documentação segue os princípios:
- **Clareza**: Explicações diretas com exemplos concretos
- **Navegabilidade**: Links internos abundantes entre conceitos relacionados
- **Praticidade**: Foco em padrões e fluxos, não em detalhes linha-a-linha
- **Atualidade**: Reflete a implementação atual do sistema
- **IA-friendly**: Estruturada para ser consumida por assistentes de IA

---

**Última atualização**: 9 de abril de 2026
