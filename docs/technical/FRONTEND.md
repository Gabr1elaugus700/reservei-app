# Frontend Architecture - App Reservei

> Documentação da arquitetura frontend: estrutura de pastas, hooks personalizados, componentes e fluxo de estado.

## 📐 Arquitetura Geral

O frontend é construído com **Next.js 16 App Router**, utilizando:
- **React 19** com Server e Client Components
- **TypeScript** para type safety
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes base
- **Custom Hooks** para lógica de negócio

```
┌─────────────────────────────────────────────┐
│          Next.js App Router                 │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌─────────────┐    │
│  │   Pages      │◄────►│   Hooks     │    │
│  │ (src/app)    │      │ (src/hooks) │    │
│  └──────┬───────┘      └──────┬──────┘    │
│         │                     │            │
│         ▼                     ▼            │
│  ┌──────────────────────────────────┐     │
│  │        Components                │     │
│  │  - UI (shadcn)                   │     │
│  │  - Features (booking, editor)    │     │
│  │  - Custom (forms, calendar)      │     │
│  └──────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Pastas

### `/src/app` — Rotas e Pages (App Router)

```
src/app/
├── globals.css          # Estilos globais Tailwind
├── layout.tsx           # Layout raiz da aplicação
├── page.tsx             # Página inicial (landing)
├── not-found.tsx        # Página 404
│
├── api/                 # API Routes (ver API_REFERENCE.md)
│   ├── auth/
│   ├── bookings/
│   ├── customer/
│   └── ...
│
├── auth/                # Páginas de autenticação
│   ├── page.tsx         # Landing auth (login/signup tabs)
│   ├── signin/
│   └── signup/
│
├── contexts/            # React Contexts
│   └── toast-context.tsx  # Sistema de notificações
│
├── features/            # Features organizadas por domínio
│   └── booking/
│       └── Capacity/
│           └── page.tsx  # Configuração de capacidade
│
└── middleware/          # (vazio - middleware está na raiz)
```

### `/src/components` — Componentes Reutilizáveis

```
src/components/
├── BookingCalendar.tsx   # Calendário de visualização de reservas
├── NewBookingForm.tsx    # Formulário de criação de reserva
├── TimeSlot.tsx          # Card de slot de horário
│
├── editor/               # Componentes de edição
│   └── ...
│
└── ui/                   # Componentes base (shadcn/ui)
    ├── button.tsx
    ├── card.tsx
    ├── checkbox.tsx
    ├── input.tsx
    ├── label.tsx
    └── navBar.tsx
```

### `/src/hooks` — Lógica de Negócio Client-Side

```
src/hooks/
├── bookingsHook.ts             # useBookings() - gerenciamento de reservas
├── use-capacity-management.ts  # useAvailabilitySchedule() - config horários
├── use-timeslots.ts            # useTimeSlots() - slots disponíveis
├── use-auth.ts                 # (deprecated - usar better-auth)
└── isLogin.ts                  # getSession() - helper server-side
```

### `/src/lib` — Utilitários e Serviços

```
src/lib/
├── auth.ts              # Configuração better-auth (server)
├── auth-client.ts       # Cliente better-auth (React hooks)
├── auth-service.ts      # getCurrentUser(), isAuthenticated()
├── cache-service.ts     # Cache localStorage com TTL
├── prisma.ts            # Prisma Client singleton
├── utils.ts             # Utilitários gerais (cn, etc)
├── format-date.ts       # Formatação de datas
│
├── validations/         # Schemas Zod
│   └── availability-config.schema.ts
│
└── (serviços de backend - ver DEVELOPMENT_PATTERNS.md)
```

---

## 🎣 Hooks Personalizados

### `useBookings(initialDate?: Date)`

**Localização**: [src/hooks/bookingsHook.ts](../../src/hooks/bookingsHook.ts)

**Propósito**: Gerenciar visualização e manipulação de reservas (Admin/Staff).

**Estado**:
```typescript
{
  currentDate: Date,
  slotGroups: Array<{
    timeSlot: TimeSlot,
    bookings: Booking[],
    totalAdults: number,
    totalChildren: number,
    totalRevenue: number
  }>,
  bookings: Booking[],
  totalDayRevenue: number,
  loading: boolean,
  error: string | null
}
```

**Métodos**:

#### `loadBookingsAndSlots()`
Carrega reservas e slots da `currentDate`:
```typescript
const { loadBookingsAndSlots } = useBookings();

// Busca em paralelo
await loadBookingsAndSlots();
// → GET /api/bookings?date=2026-04-10
// → GET /api/timeslots?date=2026-04-10
```

**Lógica de agrupamento**:
1. Busca bookings e slots da data
2. Agrupa bookings por `timeSlotId`
3. Calcula totalizadores (adultos, crianças, faturamento) por slot
4. Filtra slots: exibe apenas slots com reservas OU com capacidade disponível

---

#### `updateBooking(id, updates)`
Atualiza reserva existente:
```typescript
await updateBooking('booking-123', {
  adults: 5,
  status: 'CONFIRMED'
});
// → PATCH /api/bookings/booking-123
// → Recarrega dados automaticamente
```

---

#### `deleteBooking(id)`
Deleta reserva:
```typescript
await deleteBooking('booking-123');
// → DELETE /api/bookings/booking-123
// → Recarrega dados automaticamente
```

---

#### Navegação de Data

```typescript
nextDay();        // Avança 1 dia
previousDay();    // Volta 1 dia
goToToday();      // Vai para hoje
goToDate(date);   // Vai para data específica
```

**Recurso especial**: `findNextDayWithSlots(direction)`
- Procura próximo dia com slots disponíveis (até 30 dias)
- Usado automaticamente se data inicial não tiver slots

---

**Exemplo de uso**:
```tsx
function BookingsDashboard() {
  const {
    currentDate,
    slotGroups,
    totalDayRevenue,
    loading,
    nextDay,
    previousDay,
    updateBooking
  } = useBookings();

  if (loading) return <Spinner />;

  return (
    <div>
      <DateNavigator
        date={currentDate}
        onNext={nextDay}
        onPrev={previousDay}
      />
      
      <h2>Faturamento: R$ {totalDayRevenue}</h2>
      
      {slotGroups.map(group => (
        <div key={group.timeSlot.id}>
          <h3>{group.timeSlot.startTime} - {group.timeSlot.endTime}</h3>
          <p>Total: {group.totalAdults} adultos, {group.totalChildren} crianças</p>
          
          {group.bookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onUpdate={(updates) => updateBooking(booking.id, updates)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

### `useTimeSlots(selectedDate: Date | null)`

**Localização**: [src/hooks/use-timeslots.ts](../../src/hooks/use-timeslots.ts)

**Propósito**: Buscar slots disponíveis para seleção de horário (Cliente).

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
- Dispara fetch automaticamente quando data muda
- Chama `GET /api/timeslots?date=YYYY-MM-DD`

**Exemplo de uso**:
```tsx
function TimeSlotSelector() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { timeSlots, loading } = useTimeSlots(selectedDate);

  if (loading) return <Skeleton />;

  const availableSlots = timeSlots.filter(
    slot => slot.availableCapacity > 0
  );

  return (
    <div>
      {availableSlots.map(slot => (
        <TimeSlot
          key={slot.id}
          startTime={slot.startTime}
          endTime={slot.endTime}
          available={slot.availableCapacity}
          total={slot.totalCapacity}
        />
      ))}
    </div>
  );
}
```

---

### `useAvailabilitySchedule()`

**Localização**: [src/hooks/use-capacity-management.ts](../../src/hooks/use-capacity-management.ts)

**Propósito**: Gerenciar configuração semanal de horários (Admin).

**Estado**:
```typescript
{
  weekConfig: Array<{
    dayOfWeek: number,        // 0-6
    name: string,             // "Segunda-feira"
    shortName: string,        // "Seg"
    enabled: boolean,
    startTime: string,
    endTime: string,
    slotDurationMinutes: number,
    capacityPerSlot: number,
    breakPeriods: Array<{
      id: string,
      startTime: string,
      endTime: string
    }>
  }>,
  loading: boolean,
  saving: boolean
}
```

**Métodos**:

#### `toggleDay(dayOfWeek: number)`
Ativa/desativa dia da semana:
```typescript
toggleDay(0);  // Desabilita domingo
```

---

#### `updateDayField(dayOfWeek, field, value)`
Atualiza configuração de um dia:
```typescript
updateDayField(1, 'startTime', '08:00');
updateDayField(1, 'capacityPerSlot', 30);
updateDayField(1, 'slotDurationMinutes', 45);
```

---

#### `addBreakPeriod(dayOfWeek)`
Adiciona período de pausa:
```typescript
addBreakPeriod(1);
// → Adiciona novo break com ID gerado e horários padrão
```

---

#### `removeBreakPeriod(dayOfWeek, breakId)`
Remove pausa:
```typescript
removeBreakPeriod(1, 'break-1234567890');
```

---

#### `updateBreakPeriod(dayOfWeek, breakId, field, value)`
Atualiza horários de pausa:
```typescript
updateBreakPeriod(1, 'break-123', 'startTime', '12:30');
updateBreakPeriod(1, 'break-123', 'endTime', '13:30');
```

---

#### `saveWeeklySchedule()`
Salva toda a configuração semanal:
```typescript
const success = await saveWeeklySchedule();
// → POST /api/availability-configs/bulk
// → Gera slots automaticamente para próximos 30 dias
```

---

**Exemplo de uso**:
```tsx
function WeeklyScheduleConfig() {
  const {
    weekConfig,
    loading,
    saving,
    toggleDay,
    updateDayField,
    addBreakPeriod,
    saveWeeklySchedule
  } = useAvailabilitySchedule();

  if (loading) return <Spinner />;

  return (
    <div>
      {weekConfig.map(day => (
        <div key={day.dayOfWeek}>
          <Checkbox
            checked={day.enabled}
            onChange={() => toggleDay(day.dayOfWeek)}
          />
          <span>{day.name}</span>

          {day.enabled && (
            <>
              <input
                type="time"
                value={day.startTime}
                onChange={(e) => 
                  updateDayField(day.dayOfWeek, 'startTime', e.target.value)
                }
              />
              <input
                type="time"
                value={day.endTime}
                onChange={(e) => 
                  updateDayField(day.dayOfWeek, 'endTime', e.target.value)
                }
              />
              
              <button onClick={() => addBreakPeriod(day.dayOfWeek)}>
                + Adicionar Pausa
              </button>
            </>
          )}
        </div>
      ))}

      <button onClick={saveWeeklySchedule} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Configuração'}
      </button>
    </div>
  );
}
```

---

### `useSession()` (better-auth)

**Localização**: Importado de `@/lib/auth-client`

**Propósito**: Gerenciar sessão de usuário autenticado.

**Estado**:
```typescript
{
  data: {
    user: {
      id: string,
      name: string,
      email: string
    },
    session: {
      token: string,
      expiresAt: Date
    }
  } | null,
  isPending: boolean,
  error: Error | null
}
```

**Exemplo de uso**:
```tsx
import { useSession } from '@/lib/auth-client';

function ProfileMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Skeleton />;
  if (!session) return <LoginButton />;

  return (
    <div>
      <p>Olá, {session.user.name}</p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  );
}
```

**Ver também**: [AUTHENTICATION.md](./AUTHENTICATION.md)

---

## 🧩 Componentes Principais

### `NewBookingForm`

**Localização**: [src/components/NewBookingForm.tsx](../../src/components/NewBookingForm.tsx)

**Propósito**: Formulário de criação de nova reserva.

**Fluxo**:
1. Cliente insere número de WhatsApp
2. Sistema busca cliente automaticamente ao perder foco (`onBlur`)
3. Se encontrado: nome pré-preenchido (readonly)
4. Se novo: solicita nome
5. Controles de adultos/crianças com botões +/-
6. Submit: cria cliente (se necessário) → cria reserva

**Props**:
```typescript
{
  selectedSlot: TimeSlot,
  selectedDate: Date,
  onSuccess: () => void,
  onCancel: () => void
}
```

**Estado interno**:
```typescript
{
  phone: string,
  customerName: string,
  customerId: string | null,
  adults: number,
  children: number,
  notes: string,
  loading: boolean,
  customerFound: boolean
}
```

**Fluxo de submit**:
```typescript
async function handleSubmit() {
  let finalCustomerId = customerId;

  // 1. Criar cliente se não existe
  if (!customerId) {
    const customer = await fetch('/api/customer', {
      method: 'POST',
      body: JSON.stringify({ name: customerName, phone })
    }).then(r => r.json());
    
    finalCustomerId = customer.data.id;
  }

  // 2. Criar reserva
  await fetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      customerId: finalCustomerId,
      timeSlotId: selectedSlot.id,
      date: selectedDate,
      time: selectedSlot.startTime,
      adults,
      children,
      totalPrice: adults * 10 + children * 5,
      notes
    })
  });

  onSuccess();
}
```

---

### `BookingCalendar`

**Localização**: [src/components/BookingCalendar.tsx](../../src/components/BookingCalendar.tsx)

**Propósito**: Visualização de calendário com reservas.

**Props**:
```typescript
{
  bookings: Booking[],
  currentDate: Date,
  onDateChange: (date: Date) => void
}
```

**Features**:
- Navegação de mês
- Destaque de dias com reservas
- Click em dia → muda `currentDate`

---

### `TimeSlot`

**Localização**: [src/components/TimeSlot.tsx](../../src/components/TimeSlot.tsx)

**Propósito**: Card de exibição de slot de horário.

**Props**:
```typescript
{
  startTime: string,
  endTime: string,
  available: number,
  total: number,
  onSelect?: () => void
}
```

**Visual**:
```
┌─────────────────────────┐
│   09:00 - 09:30         │
│   ✅ 18/20 disponíveis  │
└─────────────────────────┘
```

**Estados visuais**:
- Verde: `available > total * 0.5` (mais de 50% livre)
- Amarelo: `available > 0 && available <= total * 0.5` (menos de 50% livre)
- Vermelho: `available === 0` (lotado)

---

## 🎨 Componentes UI (shadcn/ui)

### Componentes Base Disponíveis

**Localização**: [src/components/ui/](../../src/components/ui/)

| Componente | Uso | Exemplo |
|------------|-----|---------|
| **Button** | Botões de ação | `<Button variant="default">Salvar</Button>` |
| **Card** | Containers com borda | `<Card><CardHeader>Título</CardHeader></Card>` |
| **Checkbox** | Seleção booleana | `<Checkbox checked={enabled} onCheckedChange={setEnabled} />` |
| **Input** | Campos de texto | `<Input type="text" value={name} onChange={...} />` |
| **Label** | Labels de formulário | `<Label htmlFor="email">Email</Label>` |
| **NavBar** | Navegação superior | `<NavBar title="Dashboard" />` |

**Ver também**: [shadcn/ui docs](https://ui.shadcn.com/) para componentes adicionais.

---

## 🌐 Contexts

### `ToastContext`

**Localização**: [src/app/contexts/toast-context.tsx](../../src/app/contexts/toast-context.tsx)

**Propósito**: Sistema de notificações toast.

**API**:
```typescript
const { addToast, removeToast } = useToast();

// Adicionar notificação
addToast('Reserva criada com sucesso!', 'success');
addToast('Erro ao salvar dados', 'error');
addToast('Atenção: capacidade baixa', 'warning');
addToast('Informação importante', 'info');

// Remover manualmente (auto-remove após 5s)
removeToast(toastId);
```

**Tipos**:
- `success` → Verde, ícone de check
- `error` → Vermelho, ícone de X
- `warning` → Amarelo, ícone de alerta
- `info` → Azul, ícone de informação

**Exemplo de uso**:
```tsx
import { useToast } from '@/app/contexts/toast-context';

function BookingForm() {
  const { addToast } = useToast();

  async function handleSubmit() {
    try {
      await createBooking(...);
      addToast('Reserva criada!', 'success');
    } catch (error) {
      addToast('Erro ao criar reserva', 'error');
    }
  }
}
```

---

## 🔄 Fluxo de Dados Completo

### Exemplo: Criar Nova Reserva (Cliente)

```
┌────────────────────────────────────────────┐
│ 1. Cliente seleciona data no calendário    │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ 2. useTimeSlots(selectedDate)              │
│    → GET /api/timeslots?date=...           │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ 3. Renderiza lista de TimeSlot components │
│    - Filtrados por availableCapacity > 0   │
└──────────────┬─────────────────────────────┘
               │
               ▼ (cliente clica em slot)
┌────────────────────────────────────────────┐
│ 4. Abre NewBookingForm modal              │
│    - selectedSlot = slot clicado           │
│    - selectedDate = data escolhida         │
└──────────────┬─────────────────────────────┘
               │
               ▼ (cliente preenche formulário)
┌────────────────────────────────────────────┐
│ 5. onBlur do campo phone                   │
│    → GET /api/customer?phone=...           │
│    ↓                                        │
│    Se 200: pré-preenche nome (readonly)    │
│    Se 404: habilita campo de nome          │
└──────────────┬─────────────────────────────┘
               │
               ▼ (cliente clica "Reservar")
┌────────────────────────────────────────────┐
│ 6. handleSubmit()                          │
│    ↓                                        │
│    Se cliente novo:                        │
│      POST /api/customer                    │
│        { name, phone }                     │
│      ↓                                      │
│      Recebe customerId                     │
│    ↓                                        │
│    POST /api/bookings                      │
│      { customerId, timeSlotId, ... }       │
│    ↓                                        │
│    Se sucesso:                             │
│      addToast('Reserva criada!', 'success')│
│      onSuccess() → fecha modal             │
└────────────────────────────────────────────┘
```

---

### Exemplo: Visualizar Reservas (Admin)

```
┌────────────────────────────────────────────┐
│ 1. Admin acessa /dashboard                 │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ 2. useBookings(today)                      │
│    → loadBookingsAndSlots()                │
│    ↓                                        │
│    Parallel fetch:                         │
│      GET /api/bookings?date=...            │
│      GET /api/timeslots?date=...           │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ 3. Agrupa bookings por timeSlotId          │
│    Calcula totalizadores por slot          │
│    Filtra slots relevantes                 │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ 4. Renderiza SlotGroups                    │
│    Para cada grupo:                        │
│      - TimeSlot header                     │
│      - Lista de BookingCards               │
│      - Totalizadores                       │
└──────────────┬─────────────────────────────┘
               │
               ▼ (admin clica "Confirmar" em booking)
┌────────────────────────────────────────────┐
│ 5. updateBooking(id, { status: 'CONFIRMED' })│
│    → PATCH /api/bookings/[id]              │
│    ↓                                        │
│    Se sucesso:                             │
│      loadBookingsAndSlots() // Recarrega   │
│      addToast('Reserva confirmada!')       │
└────────────────────────────────────────────┘
```

---

## 🎯 Padrões de Desenvolvimento Frontend

### Server vs Client Components

**Server Components** (padrão no App Router):
```tsx
// Sem 'use client' → Server Component
export default async function BookingsPage() {
  const session = await getSession();  // Server-side
  
  if (!session) redirect('/auth/login');

  return <BookingsDashboard />;
}
```

**Client Components** (quando necessário):
```tsx
'use client';  // Marca como Client Component

export function InteractiveForm() {
  const [value, setValue] = useState('');  // useState = Client only
  
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

**Quando usar Client Component**:
- ✅ Usa hooks (useState, useEffect, custom hooks)
- ✅ Event handlers (onClick, onChange)
- ✅ Browser APIs (localStorage, window)
- ✅ React Context consumers

---

### Data Fetching

**Padrão recomendado**: Custom hooks com fetch client-side

```tsx
function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(d => setData(d.data))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading };
}
```

**Cache local** (opcional):
```typescript
import { CacheService } from '@/lib/cache-service';

const cached = CacheService.getCache<T>('my-key');
if (cached) return cached;

const data = await fetch(...);
CacheService.setCache('my-key', data, 5 * 60 * 1000); // 5 min TTL
```

---

### Formulários

**Padrão**: Controlled components com useState

```tsx
function MyForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      <Input
        value={formData.name}
        onChange={e => handleChange('name', e.target.value)}
      />
      <Button type="submit">Enviar</Button>
    </form>
  );
}
```

**Alternativa avançada**: react-hook-form (já no package.json, mas pouco usado)

---

### Estilização com Tailwind

**Padrão**: Classes utilitárias inline

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900">Título</h2>
  <Button className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600">
    Ação
  </Button>
</div>
```

**Utilitário `cn()`** para condicionais:
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === 'primary' && "primary-variant"
)}>
  ...
</div>
```

---

## 🔗 Referências Relacionadas

- **APIs**: [API_REFERENCE.md](./API_REFERENCE.md) — Endpoints consumidos pelos hooks
- **Banco de Dados**: [DATABASE.md](./DATABASE.md) — Estrutura de dados retornada
- **Sistema de Agendamento**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) — Lógica de negócio
- **Autenticação**: [AUTHENTICATION.md](./AUTHENTICATION.md) — Sessões e proteção
- **Padrões**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) — Convenções de código

---

**Última atualização**: 9 de abril de 2026
