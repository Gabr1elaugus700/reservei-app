# Database Schema - App Reservei

> Documentação completa dos modelos de dados, relacionamentos e decisões de design do banco de dados PostgreSQL.

## 📊 Visão Geral

O sistema utiliza **PostgreSQL** como banco de dados relacional, gerenciado via **Prisma ORM**. O schema está organizado em três domínios principais:

1. **Autenticação e Multi-tenancy** — User, Session, Account, Organization, Member, Invitation
2. **Sistema de Reservas** — Customer, Booking, TimeSlot, AvailabilityConfig
3. **Capacidade (Legacy)** — WeeklyCapacity, SpecialDateCapacity

---

## 🗄️ Modelos por Domínio

### 1. Sistema de Reservas (Core Business)

#### **Customer** — Clientes que fazem reservas
```prisma
model Customer {
  id        String   @id @default(cuid())
  name      String
  email     String?  @unique
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  bookings Booking[]
}
```

**Propósito**: Armazena dados de clientes finais que realizam reservas.

**Campos-chave**:
- `email` e `phone` são opcionais, mas pelo menos um deve ser fornecido
- `email` tem constraint unique para evitar duplicatas
- Relacionamento 1:N com Booking

**Decisões de design**:
- ✅ Email único permite identificação rápida de clientes retornantes
- ✅ Phone opcional suporta clientes sem email
- ⚠️ Não há constraint para garantir que ao menos um contato exista (feito via validação na API)

---

#### **Booking** — Reservas realizadas por clientes
```prisma
model Booking {
  id         String        @id @default(cuid())
  customerId String
  customer   Customer      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  date       DateTime      @db.Date
  time       String        // e.g., "14:00"
  status     BookingStatus @default(PENDING)
  notes      String?
  adults     Int
  children   Int
  totalPrice Decimal?      @db.Decimal(10, 2)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  timeSlot   TimeSlot @relation(fields: [timeSlotId], references: [id], onDelete: Restrict)
  timeSlotId String
  
  @@index([date])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

**Propósito**: Representa uma reserva feita por um cliente em um slot de horário específico.

**Campos-chave**:
- `date`: Armazenado como `@db.Date` (sem timezone) para evitar problemas de conversão
- `time`: String no formato "HH:MM" (ex: "14:00")
- `adults` e `children`: Diferenciam para cálculo de capacidade (apenas adultos contam)
- `status`: Enum com 4 estados (PENDING, CONFIRMED, CANCELLED, COMPLETED)
- `timeSlotId`: FK para TimeSlot com `onDelete: Restrict` (protege integridade)

**Decisões de design**:
- ✅ `@db.Date` evita problemas de timezone em queries
- ✅ `time` como String simplifica comparações e exibição
- ✅ `onDelete: Restrict` em TimeSlot impede deleção de slots com reservas
- ✅ `onDelete: Cascade` em Customer permite limpeza automática ao deletar cliente
- ✅ Index em `date` otimiza queries de reservas por dia

---

#### **AvailabilityConfig** — Configuração de horários de funcionamento
```prisma
model AvailabilityConfig {
  id String @id @default(cuid())
  
  dayOfWeek Int?      // 0=Domingo ... 6=Sábado
  date      DateTime? @db.Date // se definido, substitui dayOfWeek
  
  startTime           String  // "09:00"
  endTime             String  // "18:00"
  slotDurationMinutes Int     @default(30)
  capacityPerSlot     Int     @default(20)
  isException         Boolean @default(false)
  isActive            Boolean @default(true)
  
  breakPeriods Json @default("[]") // Períodos de pausa
  
  timeSlots TimeSlot[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

**Propósito**: Define configurações de horário de funcionamento, seja por dia da semana (regular) ou data específica (exceção).

**Campos-chave**:
- `dayOfWeek`: 0-6 para configurações semanais regulares (null para exceções)
- `date`: Data específica para exceções/feriados (null para configurações regulares)
- `startTime`/`endTime`: Horários de funcionamento (formato "HH:MM")
- `slotDurationMinutes`: Duração de cada slot gerado (ex: 30 minutos)
- `capacityPerSlot`: Quantas pessoas podem ser agendadas por slot
- `breakPeriods`: JSON array com pausas (ex: `[{id, startTime, endTime}]`)
- `isException`: Flag para diferenciar configurações especiais
- `isActive`: Permite desabilitar sem deletar

**Decisões de design**:
- ✅ `dayOfWeek` OR `date` permite reutilizar model para configurações regulares e exceções
- ✅ `breakPeriods` em JSON oferece flexibilidade para múltiplas pausas sem tabela adicional
- ✅ Relacionamento 1:N com TimeSlot permite geração automática de slots
- ⚠️ Não há constraint CHECK garantindo que apenas `dayOfWeek` OU `date` seja definido (validado na aplicação)

---

#### **TimeSlot** — Slots de horário gerados automaticamente
```prisma
model TimeSlot {
  id                   String  @id @default(cuid())
  availabilityConfigId String?
  
  dayOfWeek Int?      // 0-6 para slots regulares
  date      DateTime? @db.Date // data específica para slots de dias específicos
  
  startTime String // "09:00"
  endTime   String // "09:30"
  
  totalCapacity     Int     @default(1)
  availableCapacity Int     @default(1)
  isAvailable       Boolean @default(true)
  
  availabilityConfig AvailabilityConfig? @relation(fields: [availabilityConfigId], references: [id], onDelete: Cascade)
  bookings           Booking[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([dayOfWeek, startTime])
  @@index([date, startTime])
}
```

**Propósito**: Representa um slot de horário disponível para reserva, gerado automaticamente a partir de AvailabilityConfig.

**Campos-chave**:
- `dayOfWeek` / `date`: Identifica quando o slot está disponível
- `startTime` / `endTime`: Janela de tempo do slot (ex: "09:00" - "09:30")
- `totalCapacity`: Capacidade inicial (copiada de `AvailabilityConfig.capacityPerSlot`)
- `availableCapacity`: Capacidade restante após reservas (decrementada atomicamente)
- `isAvailable`: Flag para desabilitar slot sem deletar

**Decisões de design**:
- ✅ Gerado automaticamente via `timeslot-service.ts` baseado em AvailabilityConfig
- ✅ `availableCapacity` é decrementada transacionalmente ao criar Booking
- ✅ Índices compostos otimizam queries por data/dia + horário
- ✅ `onDelete: Cascade` em AvailabilityConfig permite limpeza automática
- ✅ Relacionamento 1:N com Booking permite histórico completo

---

### 2. Autenticação e Multi-tenancy

#### **User** — Usuários autenticados do sistema
```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  sessions      Session[]
  accounts      Account[]
  members       Member[]
  invitations   Invitation[]
  
  @@map("user")
}
```

**Propósito**: Usuários administrativos que gerenciam o sistema (não confundir com Customer).

**Campos-chave**:
- `email`: Único, usado para login
- `emailVerified`: Controla verificação de email
- `image`: URL de avatar (opcional)

**Relacionamentos**:
- 1:N com Session (múltiplas sessões ativas)
- 1:N com Account (múltiplos providers OAuth)
- 1:N com Member (pertence a múltiplas organizações)
- 1:N com Invitation (convites enviados)

---

#### **Session** — Sessões ativas de usuários
```prisma
model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  activeOrganizationId String?
  
  @@map("session")
}
```

**Propósito**: Gerencia sessões autenticadas com expiração e tracking.

**Campos-chave**:
- `token`: Único, armazenado em cookie
- `expiresAt`: Timestamp de expiração (7 dias por padrão)
- `activeOrganizationId`: Organização ativa no contexto multi-tenant

**Decisões de design**:
- ✅ `onDelete: Cascade` garante limpeza ao deletar usuário
- ✅ `ipAddress` e `userAgent` permitem auditoria de segurança

---

#### **Account** — Contas de autenticação (providers)
```prisma
model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // Para email/senha
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  @@map("account")
}
```

**Propósito**: Armazena credenciais de autenticação (email/senha ou OAuth).

**Campos-chave**:
- `providerId`: Identifica o provider (ex: "credential", "google")
- `password`: Hash bcrypt para autenticação email/senha
- `accessToken` / `refreshToken`: Tokens OAuth

---

#### **Organization** — Organizações (multi-tenant)
```prisma
model Organization {
  id          String       @id
  name        String
  slug        String
  logo        String?
  createdAt   DateTime
  metadata    String?
  
  members     Member[]
  invitations Invitation[]
  
  @@unique([slug])
  @@map("organization")
}
```

**Propósito**: Suporta arquitetura multi-tenant onde múltiplas organizações podem usar o sistema.

**Campos-chave**:
- `slug`: URL-friendly identifier (único)
- `metadata`: JSON string para dados customizáveis

---

#### **Member** — Membros de organizações
```prisma
model Member {
  id             String       @id
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           String
  createdAt      DateTime
  
  @@map("member")
}
```

**Propósito**: Associa usuários a organizações com roles (admin, member, etc.).

---

#### **Invitation** — Convites para organizações
```prisma
model Invitation {
  id             String       @id
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  email          String
  role           String?
  status         String       // pending, accepted, expired
  expiresAt      DateTime
  inviterId      String
  user           User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)
  
  @@map("invitation")
}
```

**Propósito**: Gerencia convites pendentes para novos membros.

---

#### **Verification** — Tokens de verificação
```prisma
model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@map("verification")
}
```

**Propósito**: Armazena tokens temporários para verificação de email, reset de senha, etc.

---

### 3. Capacidade (Legacy/Não Usado Atualmente)

#### **WeeklyCapacity** — Capacidade por dia da semana (legacy)
```prisma
model WeeklyCapacity {
  id        String   @id @default(cuid())
  dayOfWeek Int      // 0-6
  limit     Int
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([dayOfWeek])
}
```

**Status**: ⚠️ Modelo definido mas não utilizado ativamente. Substituído por AvailabilityConfig.

---

#### **SpecialDateCapacity** — Capacidade para datas específicas (legacy)
```prisma
model SpecialDateCapacity {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  limit       Int
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([date])
}
```

**Status**: ⚠️ Modelo definido mas não utilizado ativamente. Substituído por AvailabilityConfig.

**Nota**: Existe `capacity-service.ts` que manipula estes modelos, mas não há rotas de API ativas usando-os.

---

#### **LastConfigSync** — Controle de sincronização
```prisma
model LastConfigSync {
  id       String   @id @default(cuid())
  syncedAt DateTime @default(now())
}
```

**Propósito**: Rastreia última sincronização de configurações (uso interno).

---

## 🔗 Diagrama de Relacionamentos (ER)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE RESERVAS                          │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   Customer   │──────┐
    │─────────────│      │
    │ id (PK)      │      │ 1:N
    │ name         │      │
    │ email ◊      │      │
    │ phone        │      ▼
    └──────────────┘   ┌──────────────┐
                       │   Booking    │
                       │──────────────│
                       │ id (PK)      │
                       │ customerId   │──┐
                       │ timeSlotId   │──┤
                       │ date         │  │
                       │ time         │  │
                       │ adults       │  │
                       │ children     │  │
                       │ status       │  │
                       │ totalPrice   │  │
                       └──────────────┘  │
                              ▲          │
                              │          │
                           1:N│          │
                              │          │ N:1
┌─────────────────────┐       │          │
│ AvailabilityConfig  │       │          │
│─────────────────────│       │          │
│ id (PK)             │       │          │
│ dayOfWeek           │       │          │
│ date                │       │          ▼
│ startTime           │    ┌──────────────────┐
│ endTime             │    │    TimeSlot      │
│ slotDurationMinutes │──┐ │──────────────────│
│ capacityPerSlot     │  │ │ id (PK)          │
│ breakPeriods (JSON) │  │ │ configId         │◄─┘
│ isException         │  │ │ dayOfWeek        │
│ isActive            │  │ │ date             │
└─────────────────────┘  │ │ startTime        │
                       1:N│ endTime           │
                         │ │ totalCapacity    │
                         └►│ availableCapacity│
                           │ isAvailable      │
                           └──────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                 AUTENTICAÇÃO & MULTI-TENANCY                    │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │     User     │──────┬──────┬────────┐
    │──────────────│      │      │        │
    │ id (PK)      │      │      │        │
    │ name         │      │      │        │
    │ email ◊      │      │      │        │
    │ emailVerified│      │      │        │
    └──────────────┘      │      │        │
         ▲                │      │        │
         │ 1:N            │ 1:N  │ 1:N    │ 1:N
         │                │      │        │
    ┌────┴───────┐  ┌─────▼────┐ │  ┌─────▼────────┐
    │  Session   │  │ Account  │ │  │   Member     │
    │────────────│  │──────────│ │  │──────────────│
    │ id (PK)    │  │ id (PK)  │ │  │ id (PK)      │
    │ userId (FK)│  │ userId   │ │  │ userId (FK)  │
    │ token ◊    │  │ provider │ │  │ orgId (FK)   │─┐
    │ expiresAt  │  │ password │ │  │ role         │ │
    │ activeOrgId│  └──────────┘ │  └──────────────┘ │
    └────────────┘                │                   │
                                  │  ┌────────────────▼──┐
                         ┌────────▼──│  Organization     │
                         │           │───────────────────│
                         │           │ id (PK)           │
                    ┌────▼───────┐   │ name              │
                    │ Invitation │   │ slug ◊            │
                    │────────────│   │ logo              │
                    │ id (PK)    │   │ metadata (JSON)   │
                    │ email      │   └───────────────────┘
                    │ orgId (FK) │◄──┘
                    │ inviterId  │
                    │ status     │
                    └────────────┘

    ┌──────────────────┐
    │  Verification    │
    │──────────────────│
    │ id (PK)          │
    │ identifier       │
    │ value            │
    │ expiresAt        │
    └──────────────────┘


Legenda:
  ◊  = Unique constraint
  PK = Primary Key
  FK = Foreign Key
  1:N = Relacionamento um-para-muitos
  N:1 = Relacionamento muitos-para-um
```

---

## 🎯 Decisões de Design Importantes

### 1. Separação Customer vs User
- **Customer**: Clientes finais que fazem reservas (público)
- **User**: Administradores/staff que gerenciam o sistema (autenticado)
- **Propósito**: Separar domínios de acesso e responsabilidades

### 2. TimeSlot como Entidade Separada
- **Benefício**: Permite controle granular de capacidade por horário
- **Trade-off**: Requer sincronização ao modificar AvailabilityConfig
- **Solução**: `timeslot-service.ts` gerencia sincronização automática

### 3. Uso de `@db.Date` sem Timezone
- **Problema evitado**: Conversões de timezone em queries SQL
- **Implementação**: Armazenamento puro de data (YYYY-MM-DD)
- **Consequência**: Aplicação deve gerenciar timezone na camada de apresentação

### 4. Capacidade Decrementada Apenas por Adultos
- **Regra de negócio**: `children` não ocupam capacidade do slot
- **Implementação**: Transação decrementa `availableCapacity` apenas pelo valor de `adults`
- **Localização**: `POST /api/bookings` em `booking/route.ts`

### 5. `onDelete: Restrict` em TimeSlot
- **Proteção**: Impede deleção acidental de slots com reservas
- **Fluxo**: Primeiro deletar/mover Bookings, depois deletar TimeSlot
- **Alternativa**: `onDelete: Cascade` poderia deletar reservas (rejeitado por segurança)

### 6. JSON para breakPeriods
- **Vantagem**: Flexibilidade sem criar tabela adicional
- **Desvantagem**: Não permite queries SQL diretas sobre pausas
- **Justificativa**: Pausas são sempre carregadas junto com AvailabilityConfig

### 7. Modelos Legacy não Deletados
- **WeeklyCapacity** e **SpecialDateCapacity** ainda existem no schema
- **Motivo**: Preparação para possível rollback ou features futuras
- **Status atual**: Não utilizados em rotas de API

---

## 🔄 Migrações e Evolução do Schema

### Histórico de Migrações Principais
- `20251024120523_init_project` — Setup inicial
- `20251027142520_add_capacity_management` — WeeklyCapacity e SpecialDateCapacity
- `20251028132516_init_better_auth` — Modelos de autenticação
- `20251104192431_customers_table` — Criação de Customer
- `20251104194332_add_time_into_booking_table` — Campo `time` em Booking
- `20251105194557_create_tables_config_schedule` — AvailabilityConfig e TimeSlot
- `20251111172520_update_schedule_system` — Refinamentos no sistema de agendamento
- `20251113145925_update_availability_timeslot_schemas` — Schema final atual

### Comandos Prisma Úteis
```bash
# Criar nova migration após alterar schema.prisma
npx prisma migrate dev --name nome_descritivo

# Aplicar migrations em produção
npx prisma migrate deploy

# Resetar banco (cuidado: deleta tudo!)
npx prisma migrate reset

# Gerar Prisma Client após mudanças
npx prisma generate

# Seed do banco com dados iniciais
npx prisma db seed
```

---

## 📝 Queries Comuns

### Buscar BookINGS com Customer e TimeSlot
```typescript
const bookings = await prisma.booking.findMany({
  where: { date: new Date('2026-04-09') },
  include: {
    customer: true,
    timeSlot: true
  }
});
```

### Buscar TimeSlots Disponíveis para uma Data
```typescript
const slots = await prisma.timeSlot.findMany({
  where: {
    date: new Date('2026-04-09'),
    isAvailable: true,
    availableCapacity: { gt: 0 }
  },
  orderBy: { startTime: 'asc' }
});
```

### Criar Booking com Decremento Atômico de Capacidade
```typescript
await prisma.$transaction(async (tx) => {
  const booking = await tx.booking.create({
    data: { customerId, timeSlotId, date, time, adults, children }
  });
  
  await tx.timeSlot.update({
    where: { id: timeSlotId },
    data: { availableCapacity: { decrement: adults } }
  });
});
```

---

## 🔗 Referências Relacionadas

- **Sistema de Agendamento**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md)
- **APIs de Reservas**: [API_REFERENCE.md](./API_REFERENCE.md) — Seção "Bookings"
- **Autenticação**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Padrões de Transações**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md)

---

**Última atualização**: 9 de abril de 2026
