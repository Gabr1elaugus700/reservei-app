# API Reference - App Reservei

> Documentação completa de todos os endpoints da API REST com exemplos de requisições, respostas e validações.

## 📚 Índice

1. [Autenticação](#autenticação)
2. [Clientes (Customers)](#clientes-customers)
3. [Reservas (Bookings)](#reservas-bookings)
4. [Slots de Horário (TimeSlots)](#slots-de-horário-timeslots)
5. [Configuração de Disponibilidade](#configuração-de-disponibilidade)
6. [Sincronização de Configuração](#sincronização-de-configuração)
7. [Dashboard e Estatísticas](#dashboard-e-estatísticas)
8. [Health Check](#health-check)
9. [Padrões Comuns](#padrões-comuns)

---

## 🔐 Autenticação

### POST/GET `/api/auth/[...all]`

**Descrição**: Handler dinâmico do better-auth. Gerencia login, signup, logout e gerenciamento de sessões.

**Autenticação**: Não requerida

**Endpoints disponíveis** (gerenciados automaticamente pelo better-auth):
- `POST /api/auth/sign-up/email` — Criar conta
- `POST /api/auth/sign-in/email` — Login
- `POST /api/auth/sign-out` — Logout
- `GET /api/auth/session` — Obter sessão atual

**Exemplo - Sign Up**:
```bash
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "senha-segura",
  "name": "Admin User"
}
```

**Resposta** (201):
```json
{
  "user": {
    "id": "user-123",
    "email": "admin@example.com",
    "name": "Admin User",
    "emailVerified": false
  },
  "session": {
    "token": "session-token-abc123",
    "expiresAt": "2026-04-16T12:00:00Z"
  }
}
```

**Exemplo - Sign In**:
```bash
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "senha-segura"
}
```

**Resposta** (200):
```json
{
  "user": {
    "id": "user-123",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "session": {
    "token": "session-token-xyz789",
    "expiresAt": "2026-04-16T12:00:00Z"
  }
}
```

**Erros**:
- `401 Unauthorized` — Credenciais inválidas
- `400 Bad Request` — Dados faltando ou inválidos

**Ver também**: [AUTHENTICATION.md](./AUTHENTICATION.md)

---

## 👥 Clientes (Customers)

### GET `/api/customer`

**Descrição**: Busca cliente existente por número de telefone.

**Autenticação**: Não requerida

**Query Parameters**:
- `phone` (string, obrigatório) — Número de telefone do cliente

**Exemplo**:
```bash
GET /api/customer?phone=11999999999
```

**Resposta** (200):
```json
{
  "success": true,
  "data": {
    "id": "customer-123",
    "name": "João Silva",
    "phone": "11999999999",
    "email": "joao@example.com",
    "createdAt": "2026-03-15T10:00:00Z"
  }
}
```

**Resposta** (404 — Cliente não encontrado):
```json
{
  "success": false,
  "message": "Customer not found"
}
```

**Erros**:
- `400 Bad Request` — Parâmetro `phone` faltando
- `404 Not Found` — Cliente não existe

---

### POST `/api/customer`

**Descrição**: Cria novo cliente no sistema.

**Autenticação**: Não requerida

**Body**:
```json
{
  "name": "Maria Santos",
  "phone": "11988888888",
  "email": "maria@example.com"  // opcional
}
```

**Validações**:
- ✅ `name` obrigatório (string não vazia)
- ✅ `phone` obrigatório
- ✅ `email` opcional, mas deve ser único se fornecido

**Resposta** (201):
```json
{
  "success": true,
  "data": {
    "id": "customer-456",
    "name": "Maria Santos",
    "phone": "11988888888",
    "email": "maria@example.com",
    "createdAt": "2026-04-09T14:30:00Z"
  }
}
```

**Erros**:
- `400 Bad Request` — Campos obrigatórios faltando
- `409 Conflict` — Email ou telefone já existe (constraint unique)

---

### GET `/api/customer/[phone]`

**Descrição**: Busca cliente por telefone (rota alternativa).

**Autenticação**: Não requerida

**Path Parameters**:
- `phone` (string) — Número de telefone

**Exemplo**:
```bash
GET /api/customer/11999999999
```

**Resposta**: Mesma estrutura do `GET /api/customer?phone=...`

---

## 📅 Reservas (Bookings)

### GET `/api/bookings`

**Descrição**: Busca todas as reservas de uma data específica.

**Autenticação**: **Requerida** (Admin/Staff)

**Query Parameters**:
- `date` (string, obrigatório) — Data no formato `YYYY-MM-DD`

**Exemplo**:
```bash
GET /api/bookings?date=2026-04-10
Authorization: Bearer <session-token>
```

**Resposta** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-123",
      "date": "2026-04-10",
      "time": "09:00",
      "adults": 3,
      "children": 2,
      "status": "CONFIRMED",
      "notes": "Mesa próxima à janela",
      "totalPrice": "40.00",
      "customer": {
        "id": "customer-123",
        "name": "João Silva",
        "phone": "11999999999"
      },
      "timeSlotId": "slot-789",
      "createdAt": "2026-04-08T10:00:00Z"
    },
    {
      "id": "booking-124",
      "date": "2026-04-10",
      "time": "14:30",
      "adults": 2,
      "children": 0,
      "status": "PENDING",
      "customer": {
        "name": "Maria Santos",
        "phone": "11988888888"
      }
    }
  ]
}
```

**Erros**:
- `401 Unauthorized` — Sessão inválida ou ausente
- `400 Bad Request` — Parâmetro `date` faltando ou inválido

---

### POST `/api/bookings`

**Descrição**: Cria nova reserva e decrementa capacidade do slot atomicamente.

**Autenticação**: **Requerida**

**Body**:
```json
{
  "timeSlotId": "slot-789",
  "customerId": "customer-123",
  "date": "2026-04-10",
  "time": "09:00",
  "adults": 3,
  "children": 2,
  "totalPrice": 40.00,
  "notes": "Mesa próxima à janela"  // opcional
}
```

**Validações**:
- ✅ `timeSlotId` obrigatório e deve existir
- ✅ `customerId` obrigatório e deve existir
- ✅ `date` obrigatório (formato `YYYY-MM-DD`)
- ✅ `time` obrigatório (formato `HH:MM`)
- ✅ `adults >= 1` (pelo menos um adulto)
- ✅ `timeSlot.availableCapacity >= adults` (capacidade suficiente)

**Processamento** (transação atômica):
1. Verificar capacidade do slot
2. Criar registro de Booking com status `PENDING`
3. Decrementar `availableCapacity` do TimeSlot por `adults` (crianças não contam)

**Resposta** (201):
```json
{
  "success": true,
  "data": {
    "id": "booking-999",
    "customerId": "customer-123",
    "timeSlotId": "slot-789",
    "date": "2026-04-10",
    "time": "09:00",
    "adults": 3,
    "children": 2,
    "status": "PENDING",
    "totalPrice": "40.00",
    "createdAt": "2026-04-09T15:00:00Z"
  }
}
```

**Erros**:
- `400 Bad Request` — Campos obrigatórios faltando ou `adults < 1`
- `404 Not Found` — TimeSlot ou Customer não existe
- `409 Conflict` — Capacidade insuficiente no slot

**Exemplo de erro de capacidade**:
```json
{
  "success": false,
  "error": "Time slot does not have enough capacity. Available: 2, Requested: 3"
}
```

---

### PATCH `/api/bookings/[id]`

**Descrição**: Atualiza dados de uma reserva existente (quantidade de pessoas ou status).

**Autenticação**: **Requerida**

**Path Parameters**:
- `id` (string) — ID da reserva

**Body** (todos opcionais, envie apenas o que deseja atualizar):
```json
{
  "adults": 5,
  "children": 1,
  "status": "CONFIRMED"
}
```

**Validações**:
- ✅ Se `adults` mudar: recalcula capacidade do slot (incrementa/decrementa diferença)
- ✅ Se `adults` ou `children` mudar: recalcula `totalPrice` automaticamente
- ✅ `status` deve ser: `PENDING`, `CONFIRMED`, `CANCELLED`, ou `COMPLETED`

**Processamento** (transação):
1. Buscar reserva existente
2. Calcular diferença de adultos (se alterado)
3. Ajustar capacidade do slot pela diferença
4. Atualizar booking

**Exemplo** — Aumentar adultos de 3 para 5:
```bash
PATCH /api/bookings/booking-123
Content-Type: application/json

{
  "adults": 5
}
```

**Resposta** (200):
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "adults": 5,
    "children": 2,
    "totalPrice": "60.00",   // Recalculado: 5*10 + 2*5
    "status": "PENDING",
    "updatedAt": "2026-04-09T16:00:00Z"
  }
}
```

**Efeito no TimeSlot**:
```
Antes: availableCapacity = 17
Diferença: 5 - 3 = +2 adultos
Depois: availableCapacity = 17 - 2 = 15
```

**Erros**:
- `404 Not Found` — Reserva não existe
- `409 Conflict` — Nova quantidade de adultos excede capacidade disponível

---

### DELETE `/api/bookings/[id]`

**Descrição**: Deleta reserva e restaura capacidade do slot.

**Autenticação**: **Requerida**

**Path Parameters**:
- `id` (string) — ID da reserva

**Exemplo**:
```bash
DELETE /api/bookings/booking-123
```

**Processamento** (transação):
1. Buscar reserva
2. Incrementar `availableCapacity` do TimeSlot pelo número de `adults`
3. Deletar registro de Booking

**Resposta** (200):
```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

**Efeito no TimeSlot**:
```
Antes da deleção: booking tinha 3 adults
Capacidade antes: availableCapacity = 15
Capacidade depois: availableCapacity = 15 + 3 = 18
```

**Erros**:
- `404 Not Found` — Reserva não existe

---

## 🕐 Slots de Horário (TimeSlots)

### GET `/api/timeslots`

**Descrição**: Busca todos os slots de horário disponíveis para uma data específica.

**Autenticação**: Não requerida (acesso público)

**Query Parameters**:
- `date` (string, obrigatório) — Data no formato `YYYY-MM-DD`

**Exemplo**:
```bash
GET /api/timeslots?date=2026-04-10
```

**Resposta** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "slot-789",
      "date": "2026-04-10",
      "startTime": "09:00",
      "endTime": "09:30",
      "totalCapacity": 20,
      "availableCapacity": 18,
      "isAvailable": true
    },
    {
      "id": "slot-790",
      "date": "2026-04-10",
      "startTime": "09:30",
      "endTime": "10:00",
      "totalCapacity": 20,
      "availableCapacity": 20,
      "isAvailable": true
    },
    {
      "id": "slot-791",
      "date": "2026-04-10",
      "startTime": "14:00",
      "endTime": "14:30",
      "totalCapacity": 20,
      "availableCapacity": 0,
      "isAvailable": false
    }
  ]
}
```

**Observações**:
- Retorna **todos** os slots da data, mesmo cheios (`availableCapacity = 0`)
- Frontend deve filtrar por `availableCapacity > 0` para exibir apenas disponíveis
- Ordenado por `startTime` ascendente

**Erros**:
- `400 Bad Request` — Parâmetro `date` faltando ou formato inválido

---

## ⚙️ Configuração de Disponibilidade

### GET `/api/availability-configs`

**Descrição**: Busca todas as configurações de horário de funcionamento.

**Autenticação**: **Requerida**

**Cache**: 5 minutos (300 segundos)

**Exemplo**:
```bash
GET /api/availability-configs
```

**Resposta** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "config-1",
      "dayOfWeek": 1,          // Segunda-feira
      "date": null,
      "startTime": "09:00",
      "endTime": "18:00",
      "slotDurationMinutes": 30,
      "capacityPerSlot": 20,
      "breakPeriods": [
        { "id": "break-1", "startTime": "12:00", "endTime": "13:00" }
      ],
      "isException": false,
      "isActive": true,
      "createdAt": "2026-03-01T10:00:00Z"
    },
    {
      "id": "config-2",
      "dayOfWeek": null,
      "date": "2026-12-25",    // Natal (exceção)
      "isActive": false,
      "isException": true
    }
  ]
}
```

---

### POST `/api/availability-configs`

**Descrição**: Cria nova configuração de horário e gera TimeSlots automaticamente.

**Autenticação**: **Requerida**

**Body**:
```json
{
  "dayOfWeek": 1,              // 0-6 ou null
  "date": null,                // "YYYY-MM-DD" ou null
  "startTime": "09:00",
  "endTime": "18:00",
  "slotDurationMinutes": 30,
  "capacityPerSlot": 20,
  "breakPeriods": [
    { "id": "break-1", "startTime": "12:00", "endTime": "13:00" }
  ],
  "isException": false,
  "isActive": true
}
```

**Validações** (Zod Schema):
- ✅ `dayOfWeek` XOR `date` (apenas um deve ser definido)
- ✅ `startTime` e `endTime` no formato `HH:MM`
- ✅ `endTime > startTime`
- ✅ `slotDurationMinutes` deve ser múltiplo razoável (ex: 15, 30, 45, 60)
- ✅ `capacityPerSlot >= 1`
- ✅ `breakPeriods` deve ser array (pode ser vazio)

**Processamento**:
1. Validar schema
2. Criar AvailabilityConfig
3. Chamar `syncTimeSlotsForConfig()` para gerar slots automaticamente

**Resposta** (201):
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "18:00",
    ...
  }
}
```

**Erros**:
- `400 Bad Request` — Validação falhou (schema Zod)

---

### GET `/api/availability-configs/[id]`

**Descrição**: Busca configuração específica por ID.

**Autenticação**: **Requerida**

**Cache**: 5 minutos

**Exemplo**:
```bash
GET /api/availability-configs/config-123
```

**Resposta** (200): Mesma estrutura de um item da listagem.

**Erros**:
- `404 Not Found` — Configuração não existe

---

### PUT `/api/availability-configs/[id]`

**Descrição**: Atualiza configuração existente e regenera TimeSlots.

**Autenticação**: **Requerida**

**Body**: Mesma estrutura do POST (todos os campos podem ser atualizados).

**Processamento**:
1. Atualizar AvailabilityConfig
2. Chamar `syncTimeSlotsForConfig()` para resincronizar slots:
   - Slots **sem reservas**: deletados e recriados
   - Slots **com reservas**: preservados, capacidade ajustada se aumentou

**Resposta** (200):
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    ...  // Dados atualizados
  }
}
```

**Erros**:
- `404 Not Found` — Configuração não existe
- `400 Bad Request` — Validação falhou

---

### DELETE `/api/availability-configs/[id]`

**Descrição**: Deleta configuração e seus TimeSlots em cascata.

**Autenticação**: **Requerida**

**Exemplo**:
```bash
DELETE /api/availability-configs/config-123
```

**Processamento**:
- Delete cascata: Remove AvailabilityConfig e todos os TimeSlots associados
- ⚠️ **Falha** se houver TimeSlots com Bookings (constraint `onDelete: Restrict` em Booking)

**Resposta** (200):
```json
{
  "success": true,
  "message": "Availability configuration deleted"
}
```

**Erros**:
- `404 Not Found` — Configuração não existe
- `409 Conflict` — TimeSlots têm reservas (não pode deletar)

---

### POST `/api/availability-configs/bulk`

**Descrição**: Salva múltiplas configurações em uma transação e gera slots para próximos N dias.

**Autenticação**: **Requerida**

**Body**:
```json
{
  "configs": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "18:00",
      "slotDurationMinutes": 30,
      "capacityPerSlot": 20,
      "breakPeriods": [...],
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      ...
    }
  ],
  "daysAhead": 30  // Gera slots para próximos 30 dias (opcional, padrão: 30)
}
```

**Processamento**:
1. Para cada config: cria ou atualiza por `dayOfWeek` (upsert)
2. Chama `generateSlotsForPeriod(configs, daysAhead)`:
   - Para cada dia nos próximos N dias
   - Identifica config do dia da semana
   - Gera e insere TimeSlots com `date` específica
3. Batch insert com `skipDuplicates: true`

**Resposta** (200):
```json
{
  "success": true,
  "data": {
    "configs": 7,           // Configurações salvas
    "totalSlots": 840,      // Slots gerados (7 dias × 30 dias × ~4 slots/dia)
    "daysAhead": 30
  }
}
```

**Erros**:
- `400 Bad Request` — Validação falhou em alguma config

**Uso típico**: Admin configura horários semanais de segunda a domingo de uma vez.

---

## 🔄 Sincronização de Configuração

### GET `/api/set-time`

**Descrição**: Busca último registro de sincronização de configurações.

**Autenticação**: **Requerida**

**Cache**: 30 segundos

**Exemplo**:
```bash
GET /api/set-time
```

**Resposta** (200):
```json
{
  "success": true,
  "data": {
    "id": "sync-1",
    "syncedAt": "2026-04-09T10:00:00Z"
  }
}
```

---

### POST `/api/set-time`

**Descrição**: Cria novo registro de sincronização.

**Autenticação**: **Requerida**

**Body**:
```json
{
  "syncedAt": "09/04/2026"  // Formato DD/MM/YYYY
}
```

**Processamento**: Converte data para ISO e salva em `LastConfigSync`.

**Resposta** (201):
```json
{
  "success": true,
  "data": {
    "id": "sync-2",
    "syncedAt": "2026-04-09T00:00:00Z"
  }
}
```

---

### PUT `/api/set-time/[id]`

**Descrição**: Atualiza registro de sincronização.

**Autenticação**: **Requerida**

**Body**: Mesma estrutura do POST.

**Resposta** (200): Mesma estrutura do POST.

---

## 📊 Dashboard e Estatísticas

### GET `/api/dashboard/stats`

**Descrição**: Busca estatísticas do dashboard (reservas hoje, capacidade, tendências).

**Autenticação**: **Requerida**

**Exemplo**:
```bash
GET /api/dashboard/stats
```

**Resposta** (200):
```json
{
  "success": true,
  "data": {
    "todayBookings": 12,
    "todayCapacity": 240,
    "utilizationRate": 5.0,       // 12/240 = 5%
    "pendingBookings": 3,
    "confirmedBookings": 9,
    "weekComparison": "+25%",     // Comparado com semana anterior
    "nextBooking": {
      "id": "booking-555",
      "date": "2026-04-10",
      "time": "09:00",
      "customer": {
        "name": "João Silva"
      }
    }
  }
}
```

**Métricas calculadas**:
- **todayBookings**: Count de bookings com status PENDING ou CONFIRMED para hoje
- **todayCapacity**: Soma de `totalCapacity` de todos os TimeSlots de hoje
- **utilizationRate**: Percentual de ocupação (bookings / capacity * 100)
- **weekComparison**: Comparação com mesmo dia da semana anterior
- **nextBooking**: Próxima reserva futura (ordenada por date, time)

**Queries paralelas**: Usa `Promise.all()` para otimização.

---

## 🏥 Health Check

### GET `/api/health`

**Descrição**: Endpoint de status do sistema e diagnóstico.

**Autenticação**: Não requerida

**Exemplo**:
```bash
GET /api/health
```

**Resposta** (200):
```json
{
  "status": "healthy",
  "timestamp": "2026-04-09T15:30:00Z",
  "database": {
    "connected": true,
    "provider": "postgresql"
  },
  "prisma": {
    "version": "6.18.0",
    "status": "ok"
  },
  "environment": {
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://****:****@****",  // Mascarado
    "BETTER_AUTH_URL": "https://app.example.com"
  },
  "counts": {
    "users": 5,
    "customers": 234,
    "bookings": 1523,
    "timeSlots": 2100
  },
  "timezone": {
    "server": "America/Sao_Paulo",
    "offset": "-03:00"
  }
}
```

**Uso**: Monitoramento externo, debugging, validação de deployment.

---

## 🔧 Padrões Comuns

### Formato de Resposta

Todas as APIs seguem estrutura consistente:

**Sucesso**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro**:
```json
{
  "success": false,
  "error": "Mensagem de erro descritiva",
  "message": "Mensagem alternativa"  // Algumas rotas usam 'message' ao invés de 'error'
}
```

---

### Autenticação em Rotas Protegidas

**Padrão de verificação**:
```typescript
import { getCurrentUser } from '@/lib/auth-service';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401  }
    );
  }
  
  // Continuar processamento...
}
```

**Session Cookie**: Token gerenciado automaticamente pelo better-auth via cookie HTTP-only.

---

### Validação de Entrada

**Padrão manual** (maioria das rotas):
```typescript
if (!timeSlotId || !customerId || !date) {
  return NextResponse.json(
    { success: false, error: 'Missing required fields' },
    { status: 400 }
  );
}
```

**Validação com Zod** (availability configs):
```typescript
import { availabilityConfigSchema } from '@/lib/validations/availability-config.schema';

const validation = availabilityConfigSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    { success: false, error: validation.error.message },
    { status: 400 }
  );
}
```

---

### Transações Atômicas

**Todas as operações que modificam capacidade usam transações**:

```typescript
await prisma.$transaction(async (tx) => {
  // Operação 1
  await tx.booking.create({ ... });
  
  // Operação 2 (dependente)
  await tx.timeSlot.update({
    data: { availableCapacity: { decrement: adults } }
  });
});
```

**Garantia**: Tudo sucede ou tudo falha (rollback automático em erro).

---

### Tratamento de Erros Prisma

**Unique Constraint** (P2002):
```typescript
try {
  await prisma.customer.create({ ... });
} catch (error: any) {
  if (error.code === 'P2002') {
    return NextResponse.json(
      { success: false, error: 'Customer already exists' },
      { status: 409 }
    );
  }
  throw error;  // Re-throw se for outro tipo de erro
}
```

**Not Found** (retorno `null`):
```typescript
const booking = await prisma.booking.findUnique({ where: { id } });
if (!booking) {
  return NextResponse.json(
    { success: false, error: 'Booking not found' },
    { status: 404 }
  );
}
```

---

### Códigos de Status HTTP

| Código | Uso | Exemplo |
|--------|-----|---------|
| **200 OK** | Sucesso em GET, PUT, PATCH, DELETE | Listagem de bookings |
| **201 Created** | Recurso criado com sucesso | POST booking, customer, config |
| **400 Bad Request** | Validação falhou ou dados inválidos | Campos obrigatórios faltando |
| **401 Unauthorized** | Autenticação necessária mas ausente | Acesso sem session token |
| **404 Not Found** | Recurso não encontrado | Booking inexistente |
| **409 Conflict** | Conflito de lógica de negócio | Capacidade insuficiente, email duplicado |
| **500 Internal Server Error** | Erro não tratado | Falha no banco, exceção inesperada |

---

### Headers Comuns

**Request**:
```
Content-Type: application/json
Cookie: better-auth.session_token=<token>  // Gerenciado automaticamente pelo navegador
```

**Response**:
```
Content-Type: application/json
Cache-Control: public, max-age=300  // Em rotas com cache
```

---

## 🔗 Referências Relacionadas

- **Modelos de Dados**: [DATABASE.md](./DATABASE.md)
- **Sistema de Agendamento**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md)
- **Autenticação**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Padrões de Código**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md)

---

**Última atualização**: 9 de abril de 2026
