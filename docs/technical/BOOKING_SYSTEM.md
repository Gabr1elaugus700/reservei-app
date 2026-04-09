# Sistema de Agendamento e Reservas

> Documentação completa do sistema central de agendamento: configuração de horários, geração de slots e fluxo de reservas.

## 🎯 Visão Geral

O sistema de agendamento do **App Reservei** funciona em três camadas principais:

1. **Configuração** — Admin define horários de funcionamento via `AvailabilityConfig`
2. **Geração Automática** — Sistema gera `TimeSlots` disponíveis baseados na configuração
3. **Reserva** — Clientes criam `Bookings` que decrementam capacidade dos slots

```
┌─────────────────────────────────────────────────────┐
│  FLUXO COMPLETO DE AGENDAMENTO                      │
└─────────────────────────────────────────────────────┘

1. Admin configura horários
   ↓
   AvailabilityConfig {
     Segunda: 09:00-18:00, slots de 30min, 20 pessoas/slot
     Pausa: 12:00-13:00
   }
   ↓
2. Sistema gera slots automaticamente
   ↓
   TimeSlot[] = [
     { startTime: "09:00", endTime: "09:30", capacity: 20 },
     { startTime: "09:30", endTime: "10:00", capacity: 20 },
     ...
     { startTime: "13:00", endTime: "13:30", capacity: 20 }, // após pausa
     ...
   ]
   ↓
3. Cliente faz reserva
   ↓
   Booking {
     customer: "João Silva",
     timeSlot: "09:00-09:30",
     adults: 2,
     children: 1
   }
   ↓
4. Capacidade decrementada atomicamente
   ↓
   TimeSlot["09:00-09:30"].availableCapacity -= 2 (apenas adultos)
```

---

## 📋 Camada 1: Configuração de Horários

### AvailabilityConfig — O que é?

Um **AvailabilityConfig** define quando o sistema aceita agendamentos. Pode ser:
- **Configuração Regular**: Aplica-se a um dia da semana (ex: todas as segundas-feiras)
- **Configuração Excepcional**: Aplica-se a uma data específica (ex: 25/12/2026 fechado)

### Estrutura de uma Configuração

```typescript
{
  id: "config-123",
  dayOfWeek: 1,              // 0=Dom, 1=Seg, ..., 6=Sáb (null se for exceção)
  date: null,                // Data específica (null se for config regular)
  
  startTime: "09:00",        // Horário de abertura
  endTime: "18:00",          // Horário de fechamento
  slotDurationMinutes: 30,   // Duração de cada slot (30 min)
  capacityPerSlot: 20,       // Quantas pessoas por slot
  
  breakPeriods: [            // Períodos de pausa (JSON)
    { id: "break-1", startTime: "12:00", endTime: "13:00" },
    { id: "break-2", startTime: "15:00", endTime: "15:30" }
  ],
  
  isException: false,        // Se for exceção (feriado, dia especial)
  isActive: true             // Habilita/desabilita sem deletar
}
```

### Configurações Regulares vs. Exceções

| Tipo | `dayOfWeek` | `date` | `isException` | Exemplo |
|------|-------------|--------|---------------|---------|
| **Regular** | 0-6 | `null` | `false` | Todas as segundas-feiras, 09:00-18:00 |
| **Exceção** | `null` | Data específica | `true` | 25/12/2026 fechado (capacidade 0) |
| **Exceção Override** | `null` | Data específica | `true` | 01/01/2027 abre 14:00-20:00 |

### Lógica de Pausas (Break Periods)

Períodos de pausa **excluem** horários da geração de slots.

**Exemplo**:
```javascript
// Configuração
startTime: "09:00"
endTime: "14:00"
slotDuration: 30 min
breakPeriods: [{ startTime: "12:00", endTime: "13:00" }]

// Slots gerados (pausas excluídas)
09:00-09:30 ✅
09:30-10:00 ✅
10:00-10:30 ✅
10:30-11:00 ✅
11:00-11:30 ✅
11:30-12:00 ✅
12:00-12:30 ❌ (dentro da pausa)
12:30-13:00 ❌ (dentro da pausa)
13:00-13:30 ✅
13:30-14:00 ✅
```

**Implementação**: Ver `generateTimeSlots()` em [src/lib/timeslot-service.ts](../../src/lib/timeslot-service.ts)

---

## ⚙️ Camada 2: Geração Automática de Slots

### Como Funciona a Geração

Quando um **AvailabilityConfig** é salvo, o sistema automaticamente:

1. **Calcula slots** — Divide `startTime` até `endTime` em intervalos de `slotDurationMinutes`
2. **Exclui pausas** — Remove slots que caem dentro de `breakPeriods`
3. **Persiste TimeSlots** — Salva no banco com `totalCapacity = capacityPerSlot`

### Exemplo Prático

**Input** (AvailabilityConfig para Segundas):
```javascript
{
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "11:00",
  slotDurationMinutes: 30,
  capacityPerSlot: 20,
  breakPeriods: []
}
```

**Output** (TimeSlots gerados):
```javascript
[
  { dayOfWeek: 1, startTime: "09:00", endTime: "09:30", totalCapacity: 20, availableCapacity: 20 },
  { dayOfWeek: 1, startTime: "09:30", endTime: "10:00", totalCapacity: 20, availableCapacity: 20 },
  { dayOfWeek: 1, startTime: "10:00", endTime: "10:30", totalCapacity: 20, availableCapacity: 20 },
  { dayOfWeek: 1, startTime: "10:30", endTime: "11:00", totalCapacity: 20, availableCapacity: 20 }
]
```

### Geração Bulk para Próximos Dias

API `/api/availability-configs/bulk` permite gerar slots para os próximos N dias:

```typescript
POST /api/availability-configs/bulk
{
  "configs": [ /* configurações de segunda a domingo */ ],
  "daysAhead": 30  // Gera slots para os próximos 30 dias
}
```

**Processo**:
1. Salva/atualiza configurações semanais
2. Para cada dia nos próximos 30 dias:
   - Identifica qual configuração aplicar (por `dayOfWeek`)
   - Gera TimeSlots com `date` específica
3. Insere em batch no banco com `skipDuplicates: true`

**Service**: `generateSlotsForPeriod()` em [src/lib/timeslot-service.ts](../../src/lib/timeslot-service.ts)

---

## 🔄 Sincronização de Slots após Mudanças de Configuração

### Problema

Quando um **AvailabilityConfig** é alterado (ex: mudar horário de 09:00 para 10:00), os **TimeSlots** já gerados podem ficar desatualizados.

### Solução: Sincronização Inteligente

Função `syncTimeSlotsForConfig()` em [src/lib/timeslot-service.ts](../../src/lib/timeslot-service.ts):

#### Regras de Sincronização

1. **Slots SEM reservas**: Deletados e recriados conforme nova configuração
2. **Slots COM reservas**: 
   - ❌ **Nunca deletados** (preserva integridade das reservas)
   - ✅ **Capacidade é ajustada** apenas se nova > antiga (para evitar overbooking)
   - ⚠️ Se slot não faz mais parte da configuração, permanece mas não é mais gerado
3. **Novos slots da configuração**: Criados normalmente

#### Exemplo de Sincronização

**Antes** (Config: 09:00-12:00, 30min slots):
```
09:00-09:30 → 5 reservas (preservar)
09:30-10:00 → 0 reservas (pode deletar)
10:00-10:30 → 0 reservas (pode deletar)
10:30-11:00 → 2 reservas (preservar)
11:30-12:00 → 0 reservas (pode deletar)
```

**Depois** (Config alterada: 10:00-14:00, 45min slots):
```
09:00-09:30 → 5 reservas (MANTIDO - fora da nova config, mas tem reservas)
10:00-10:45 → CRIADO (novo slot)
10:45-11:30 → CRIADO (novo slot)
11:30-12:15 → CRIADO (novo slot)
12:15-13:00 → CRIADO (novo slot)
13:00-13:45 → CRIADO (novo slot)
```

**⚠️ Atenção**: Slot `09:00-09:30` permanece no banco mesmo não fazendo parte da nova configuração, pois tem reservas.

---

## 📅 Camada 3: Fluxo de Reserva Completo

### Passo 1: Cliente Seleciona Data

Cliente acessa interface e seleciona data desejada.

**Requisição**:
```
GET /api/timeslots?date=2026-04-10
```

**Resposta** (slots disponíveis):
```json
[
  {
    "id": "slot-123",
    "startTime": "09:00",
    "endTime": "09:30",
    "availableCapacity": 18,
    "totalCapacity": 20,
    "date": "2026-04-10"
  },
  {
    "id": "slot-124",
    "startTime": "09:30",
    "endTime": "10:00",
    "availableCapacity": 20,
    "totalCapacity": 20,
    "date": "2026-04-10"
  }
]
```

**Lógica**: Retorna apenas slots onde `isAvailable = true` e `availableCapacity > 0`.

---

### Passo 2: Verificar ou Criar Cliente

Antes de criar a reserva, sistema verifica se cliente já existe:

**2.1. Buscar por telefone**:
```
GET /api/customer?phone=11999999999
```

**Se encontrado** (200):
```json
{
  "id": "customer-456",
  "name": "João Silva",
  "phone": "11999999999",
  "email": "joao@example.com"
}
```

**Se NÃO encontrado** (404):
```
POST /api/customer
{
  "name": "João Silva",
  "phone": "11999999999"
}
```

**Retorna** (201):
```json
{
  "id": "customer-789",
  "name": "João Silva",
  "phone": "11999999999"
}
```

---

### Passo 3: Criar Reserva com Transação Atômica

**Requisição**:
```
POST /api/bookings
{
  "timeSlotId": "slot-123",
  "customerId": "customer-456",
  "date": "2026-04-10",
  "time": "09:00",
  "adults": 3,
  "children": 2,
  "totalPrice": 40.00,
  "notes": "Mesa próxima à janela"
}
```

**Validações**:
1. ✅ `timeSlotId` existe?
2. ✅ `customerId` existe?
3. ✅ `adults >= 1`?
4. ✅ `timeSlot.availableCapacity >= adults`?

**Processamento Transacional** (atomicidade garantida):
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Verificar capacidade
  const timeSlot = await tx.timeSlot.findUnique({
    where: { id: timeSlotId }
  });
  
  if (timeSlot.availableCapacity < adults) {
    throw new Error("Capacidade insuficiente");
  }
  
  // 2. Criar reserva
  const booking = await tx.booking.create({
    data: {
      customerId,
      timeSlotId,
      date,
      time,
      adults,
      children,
      status: "PENDING",
      totalPrice
    }
  });
  
  // 3. Decrementar capacidade (APENAS por adultos)
  await tx.timeSlot.update({
    where: { id: timeSlotId },
    data: {
      availableCapacity: {
        decrement: adults  // Crianças NÃO contam
      }
    }
  });
  
  return booking;
});
```

**Resposta** (201):
```json
{
  "success": true,
  "data": {
    "id": "booking-999",
    "customerId": "customer-456",
    "timeSlotId": "slot-123",
    "date": "2026-04-10",
    "time": "09:00",
    "adults": 3,
    "children": 2,
    "status": "PENDING"
  }
}
```

---

### Regra de Capacidade: Apenas Adultos Contam

**❗ Regra de Negócio Importante**:
- `adults` → Decrementa `availableCapacity`
- `children` → **NÃO** decrementa capacidade (apenas informação para cobrança)

**Exemplo**:
```
Slot inicial: totalCapacity = 20, availableCapacity = 20

Reserva 1: adults=3, children=2
→ availableCapacity = 20 - 3 = 17

Reserva 2: adults=5, children=1
→ availableCapacity = 17 - 5 = 12

Reserva 3: adults=12, children=0
→ availableCapacity = 12 - 12 = 0 (slot lotado)
```

---

## 🔄 Operações em Reservas Existentes

### Atualizar Reserva

```
PATCH /api/bookings/[id]
{
  "adults": 5,       // Aumentou de 3 para 5
  "children": 1,     // Diminuiu de 2 para 1
  "status": "CONFIRMED"
}
```

**Lógica de Ajuste de Capacidade**:
```typescript
// Calcular diferença
const oldAdults = booking.adults; // 3
const newAdults = 5;
const difference = newAdults - oldAdults; // +2

// Ajustar capacidade
await tx.timeSlot.update({
  where: { id: booking.timeSlotId },
  data: {
    availableCapacity: {
      decrement: difference  // -2 (menos vagas disponíveis)
    }
  }
});
```

**Se `difference` for negativo** (cliente diminuiu adultos):
```typescript
// Exemplo: 5 → 3 = -2 (libera 2 vagas)
decrement: -2  // Equivale a increment: 2
```

---

### Deletar Reserva

```
DELETE /api/bookings/[id]
```

**Lógica** (transacional):
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Buscar reserva
  const booking = await tx.booking.findUnique({ where: { id } });
  
  // 2. Restaurar capacidade
  await tx.timeSlot.update({
    where: { id: booking.timeSlotId },
    data: {
      availableCapacity: {
        increment: booking.adults  // Libera vagas
      }
    }
  });
  
  // 3. Deletar reserva
  await tx.booking.delete({ where: { id } });
});
```

---

## 📊 Estatísticas e Dashboard

### Endpoint de Estatísticas

```
GET /api/dashboard/stats
```

**Métricas calculadas**:
- Total de reservas hoje (PENDING + CONFIRMED)
- Capacidade total disponível hoje
- Comparação com semana anterior
- Próxima reserva agendada

**Resposta**:
```json
{
  "todayBookings": 12,
  "todayCapacity": 240,
  "utilizationRate": 5.0,   // 12/240 = 5%
  "weekComparison": "+25%",
  "nextBooking": {
    "date": "2026-04-10",
    "time": "09:00",
    "customer": "João Silva"
  }
}
```

---

## 🔗 Arquitetura de Serviços

### timeslot-service.ts

**Responsabilidades**:
- `generateTimeSlots(config)` — Gera array de slots baseado em configuração
- `generateSlotsForPeriod(configs, daysAhead)` — Geração bulk para N dias
- `syncTimeSlotsForConfig(configId)` — Sincroniza slots após mudanças
- `syncAllTimeSlots()` — Regenera todos os slots do sistema
- `getAvailableSlots(date)` — Query de slots disponíveis

**Localização**: [src/lib/timeslot-service.ts](../../src/lib/timeslot-service.ts)

---

### capacity-service.ts (Legacy)

**Status**: ⚠️ Não utilizado ativamente

**Responsabilidades** (definidas mas não usadas em APIs):
- Gerenciar `WeeklyCapacity` e `SpecialDateCapacity`
- CRUD de configurações de capacidade simplificadas

**Nota**: Sistema atual usa `AvailabilityConfig` + `TimeSlot` ao invés destes modelos.

**Localização**: [src/lib/capacity-service.ts](../../src/lib/capacity-service.ts)

---

## 🎨 Frontend: Hooks de Gerenciamento

### useAvailabilitySchedule()

**Propósito**: Gerenciar configuração semanal de horários (Admin).

**Estado**:
```typescript
{
  weekConfig: DayConfig[],  // 7 dias da semana
  loading: boolean,
  saving: boolean
}
```

**Métodos principais**:
- `toggleDay(dayOfWeek)` — Ativa/desativa dia
- `updateDayField(dayOfWeek, field, value)` — Altera horários/capacidade/duração
- `addBreakPeriod(dayOfWeek)` — Adiciona pausa
- `removeBreakPeriod(dayOfWeek, breakId)` — Remove pausa
- `saveWeeklySchedule()` — Envia para `/api/availability-configs/bulk`

**Localização**: [src/hooks/use-capacity-management.ts](../../src/hooks/use-capacity-management.ts)

---

### useTimeSlots(selectedDate)

**Propósito**: Buscar slots disponíveis para uma data específica (Cliente).

**Estado**:
```typescript
{
  timeSlots: TimeSlot[],
  loading: boolean,
  error: string | null
}
```

**Funcionamento**:
- Recebe `selectedDate` como prop
- Fetch automático ao mudar data
- Chama `/api/timeslots?date=YYYY-MM-DD`
- Retorna apenas slots com `availableCapacity > 0`

**Localização**: [src/hooks/use-timeslots.ts](../../src/hooks/use-timeslots.ts)

---

### useBookings(initialDate)

**Propósito**: Gerenciar visualização de reservas por data (Admin/Staff).

**Estado**:
```typescript
{
  currentDate: Date,
  slotGroups: SlotGroup[],  // Slots agrupados com suas reservas
  bookings: Booking[],
  totalDayRevenue: number,
  loading: boolean
}
```

**Métodos principais**:
- `loadBookingsAndSlots()` — Carrega reservas e slots da data atual
- `updateBooking(id, updates)` — Atualiza status/quantidade de pessoas
- `deleteBooking(id)` — Deleta reserva e restaura capacidade
- `nextDay()` / `previousDay()` — Navegação de calendário
- `goToDate(date)` — Vai para data específica

**Lógica de Agrupamento**:
```typescript
// Agrupa reservas por slot
slotGroups = [
  {
    timeSlot: { startTime: "09:00", endTime: "09:30" },
    bookings: [booking1, booking2],
    totalAdults: 5,
    totalRevenue: 50.00
  },
  ...
]
```

**Localização**: [src/hooks/bookingsHook.ts](../../src/hooks/bookingsHook.ts)

---

## 🚨 Tratamento de Erros

### Cenários Comuns de Erro

| Erro | Status | Mensagem | Causa |
|------|--------|----------|-------|
| Slot não encontrado | 404 | "Time slot not found" | `timeSlotId` inválido |
| Capacidade insuficiente | 409 | "Time slot does not have enough capacity" | `availableCapacity < adults` |
| Adultos obrigatórios | 400 | "At least one adult is required" | `adults < 1` |
| Cliente não encontrado | 404 | "Customer not found" | `customerId` inválido |
| Campos obrigatórios | 400 | "Missing required fields" | Payload incompleto |

### Transações e Atomicidade

**Todas as operações que modificam capacidade usam `prisma.$transaction()`**:

✅ **Garantias**:
- Criação de Booking + decremento de capacidade são atômicos
- Rollback automático em caso de erro
- Nenhuma reserva parcialmente persistida

❌ **Sem transação** (EVITAR):
```typescript
// ❌ ERRADO - Race condition possível
await prisma.booking.create({ ... });
await prisma.timeSlot.update({ ... });  // Se falhar, booking fica órfão
```

✅ **Com transação** (CORRETO):
```typescript
// ✅ CORRETO - Tudo ou nada
await prisma.$transaction(async (tx) => {
  await tx.booking.create({ ... });
  await tx.timeSlot.update({ ... });
});
```

---

## 📐 Diagrama de Fluxo Completo

```
┌────────────────────────────────────────────────────────────────┐
│                     ADMIN: CONFIGURAÇÃO                        │
└────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ Admin UI         │
│ (Dashboard)      │
└────────┬─────────┘
         │
         │ 1. Configurar horários semanais
         ▼
┌────────────────────────────┐
│ useAvailabilitySchedule()  │
│ - toggleDay()              │
│ - updateDayField()         │
│ - addBreakPeriod()         │
└────────┬───────────────────┘
         │
         │ 2. Salvar configuração
         ▼
  POST /api/availability-configs/bulk
  { configs: [...], daysAhead: 30 }
         │
         │ 3. Backend processa
         ▼
┌─────────────────────────────┐
│ API Route Handler           │
│ - Validação Zod schema      │
│ - Salvar AvailabilityConfig │
└────────┬────────────────────┘
         │
         │ 4. Acionar geração
         ▼
┌──────────────────────────────┐
│ generateSlotsForPeriod()     │
│ - Para próximos 30 dias      │
│ - Cria TimeSlots por dia     │
│ - Batch insert               │
└──────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                   CLIENTE: FAZER RESERVA                        │
└────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ Cliente UI       │
│ (Página Pública) │
└────────┬─────────┘
         │
         │ 1. Selecionar data
         ▼
┌────────────────────────┐
│ useTimeSlots(date)     │
│ - Fetch slots do dia   │
└────────┬───────────────┘
         │
         │ 2. Buscar slots
         ▼
  GET /api/timeslots?date=2026-04-10
         │
         │ 3. Retornar disponíveis
         ▼
  [ { startTime: "09:00", availableCapacity: 18 }, ... ]
         │
         │ 4. Cliente escolhe slot + preenche formulário
         ▼
┌────────────────────────┐
│ NewBookingForm         │
│ - Buscar cliente       │
│ - Criar se necessário  │
│ - Criar reserva        │
└────────┬───────────────┘
         │
         │ 5. Verificar cliente
         ▼
  GET /api/customer?phone=...
      200 ✅ (usa existente)
      404 ❌ → POST /api/customer
         │
         │ 6. Criar reserva
         ▼
  POST /api/bookings
  { timeSlotId, customerId, adults, children, ... }
         │
         │ 7. Validação + Transação
         ▼
┌──────────────────────────────┐
│ prisma.$transaction()        │
│ 1. Verificar capacidade      │
│ 2. Criar Booking             │
│ 3. Decrementar capacity      │
└──────────────────────────────┘
         │
         │ 8. Confirmação
         ▼
  201 Created
  { id, status: "PENDING", ... }
```

---

## 🔍 Casos de Uso Especiais

### Caso 1: Feriado com Horário Diferente

**Cenário**: 01/01/2027 abre excepcionalmente 14:00-20:00 (normalmente fecha).

**Solução**:
```javascript
POST /api/availability-configs
{
  "date": "2027-01-01",         // Data específica
  "dayOfWeek": null,
  "startTime": "14:00",
  "endTime": "20:00",
  "capacityPerSlot": 15,         // Capacidade reduzida
  "isException": true,
  "isActive": true
}
```

**Resultado**: Slots gerados apenas para 01/01/2027 das 14:00-20:00.

---

### Caso 2: Dia Totalmente Fechado

**Cenário**: 25/12/2026 não aceita agendamentos.

**Solução 1** (Recomendada):
```javascript
POST /api/availability-configs
{
  "date": "2026-12-25",
  "dayOfWeek": null,
  "isActive": false,             // Configuração inativa
  "isException": true
}
```

**Solução 2** (Alternativa):
- Não criar configuração para esta data
- Sistema automaticamente não gera slots

---

### Caso 3: Aumentar Capacidade de Slot Específico

**Cenário**: Slot 09:00-09:30 de 10/04/2026 precisa de capacidade extra (evento especial).

**Solução** (manual via banco):
```sql
UPDATE "TimeSlot"
SET "totalCapacity" = 50,
    "availableCapacity" = "availableCapacity" + 30
WHERE "date" = '2026-04-10'
  AND "startTime" = '09:00';
```

**⚠️ Nota**: Não há endpoint de API para isso atualmente. Feature futura.

---

## 🔗 Referências Relacionadas

- **Modelos de Banco**: [DATABASE.md](./DATABASE.md) — AvailabilityConfig, TimeSlot, Booking
- **APIs**: [API_REFERENCE.md](./API_REFERENCE.md) — Endpoints de reservas e configuração
- **Hooks**: [FRONTEND.md](./FRONTEND.md) — useBookings, useTimeSlots, useAvailabilitySchedule
- **Serviços**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) — Padrões de transação

---

**Última atualização**: 9 de abril de 2026
