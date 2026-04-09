# Development Patterns - App Reservei

> Padrões de código, convenções e best practices para desenvolvimento consistente no projeto.

## 🎯 Princípios Fundamentais

1. **Services First** — Lógica de negócio em camada de serviços (`src/lib/*-service.ts`)
2. **Transactional Integrity** — Operações críticas em `prisma.$transaction()`
3. **Type Safety** — TypeScript strict mode, tipos explícitos
4. **Schema Validation** — Zod para validação compartilhada client/server
5. **Error Handling** — Respostas consistentes com status HTTP adequados

---

## 📁 Organização de Código

### Estrutura de Camadas

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│    (src/app - Pages & API Routes)       │
├─────────────────────────────────────────┤
│          Business Logic Layer           │
│       (src/lib/*-service.ts)            │
├─────────────────────────────────────────┤
│           Data Access Layer             │
│          (Prisma Client)                │
├─────────────────────────────────────────┤
│              Database                   │
│           (PostgreSQL)                  │
└─────────────────────────────────────────┘
```

**Regra**: API Routes NÃO devem conter lógica de negócio complexa. Delegam para Services.

---

## 🔧 Padrão de API Routes

### Template Base

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-service';
import { myService } from '@/lib/my-service';

export async function GET(request: Request) {
  try {
    // 1. Autenticação (se necessário)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Extrair e validar parâmetros
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: date' },
        { status: 400 }
      );
    }

    // 3. Delegar para service
    const data = await myService.getData(date);

    // 4. Resposta de sucesso
    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    // 5. Error handling
    console.error('[API Error]', error);
    
    // Prisma unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Resource already exists' },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Checklist de API Route

✅ Autenticação verificada primeiro (se necessário)  
✅ Validação de parâmetros antes de processamento  
✅ Lógica delegada para service layer  
✅ Try-catch para error handling  
✅ Respostas consistentes `{ success, data/error }`  
✅ Status HTTP adequados (200, 201, 400, 401, 404, 409, 500)  
✅ Logs de erros com contexto (`console.error`)  

---

## 🧩 Padrão de Services

### Template de Service

**Localização**: `src/lib/my-feature-service.ts`

```typescript
import { prisma } from './prisma';

export interface MyEntityData {
  id: string;
  name: string;
  // ...
}

class MyFeatureService {
  
  // READ operations
  async getAll(): Promise<MyEntityData[]> {
    const entities = await prisma.myEntity.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return entities.map(this.mapToDTO);
  }

  async getById(id: string): Promise<MyEntityData | null> {
    const entity = await prisma.myEntity.findUnique({
      where: { id }
    });
    
    return entity ? this.mapToDTO(entity) : null;
  }

  // WRITE operations (sempre transacionais se afetam múltiplas tabelas)
  async create(data: Partial<MyEntityData>): Promise<MyEntityData> {
    const entity = await prisma.myEntity.create({
      data: {
        name: data.name,
        // ...
      }
    });
    
    return this.mapToDTO(entity);
  }

  async update(id: string, data: Partial<MyEntityData>): Promise<MyEntityData> {
    const entity = await prisma.myEntity.update({
      where: { id },
      data
    });
    
    return this.mapToDTO(entity);
  }

  async delete(id: string): Promise<void> {
    await prisma.myEntity.delete({
      where: { id }
    });
  }

  // PRIVATE helpers
  private mapToDTO(entity: any): MyEntityData {
    return {
      id: entity.id,
      name: entity.name,
      // Transformações, formatações, etc.
    };
  }
}

// Export singleton
export const myFeatureService = new MyFeatureService();
```

### Checklist de Service

✅ Classe singleton exportada  
✅ Interfaces TypeScript para DTOs  
✅ Métodos privados `mapToDTO()` para transformações  
✅ Operações de escrita em `$transaction()` se necessário  
✅ Sem lógica de HTTP (sem NextResponse, status codes)  
✅ Retorna dados puros ou throw Error  

---

## 🔒 Padrão de Transações

### Quando Usar Transações

**✅ USE transações quando**:
- Criar Booking + decrementar TimeSlot capacity
- Atualizar Booking + ajustar TimeSlot capacity
- Deletar Booking + restaurar TimeSlot capacity
- Qualquer operação que modifica > 1 tabela
- Operações com dependência de integridade

**❌ NÃO precisa de transação quando**:
- Simples READ (findMany, findUnique)
- CREATE/UPDATE/DELETE de tabela única sem side-effects

---

### Template de Transação

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Validar estado atual
  const slot = await tx.timeSlot.findUnique({
    where: { id: timeSlotId }
  });
  
  if (!slot || slot.availableCapacity < adults) {
    throw new Error('Insufficient capacity');
  }

  // 2. Operação principal
  const booking = await tx.booking.create({
    data: {
      customerId,
      timeSlotId,
      adults,
      children,
      // ...
    }
  });

  // 3. Operação dependente
  await tx.timeSlot.update({
    where: { id: timeSlotId },
    data: {
      availableCapacity: {
        decrement: adults
      }
    }
  });

  // 4. Retornar resultado
  return booking;
});
```

**Importante**:
- ✅ Use `tx.` ao invés de `prisma.` dentro da transação
- ✅ Throw Error para rollback automático
- ✅ Return no final da transação para capturar resultado

---

## ✅ Padrão de Validação

### Validação Manual (maioria das rotas)

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  const { timeSlotId, customerId, adults } = body;

  // Validação de campos obrigatórios
  if (!timeSlotId || !customerId || !adults) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: timeSlotId, customerId, adults' },
      { status: 400 }
    );
  }

  // Validação de regras de negócio
  if (adults < 1) {
    return NextResponse.json(
      { success: false, error: 'At least one adult is required' },
      { status: 400 }
    );
  }

  // Continuar processamento...
}
```

---

### Validação com Zod (recomendado para schemas complexos)

**Schema** — `src/lib/validations/availability-config.schema.ts`:
```typescript
import { z } from 'zod';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const breakPeriodSchema = z.object({
  id: z.string(),
  startTime: z.string().regex(timeRegex, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(timeRegex, 'Invalid time format (HH:MM)'),
});

export const availabilityConfigSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).nullable(),
  date: z.string().nullable(),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  slotDurationMinutes: z.number().min(5).max(240),
  capacityPerSlot: z.number().min(1),
  breakPeriods: z.array(breakPeriodSchema).default([]),
  isActive: z.boolean().default(true),
  isException: z.boolean().default(false),
}).refine(
  data => data.endTime > data.startTime,
  { message: 'endTime must be after startTime' }
).refine(
  data => (data.dayOfWeek !== null) !== (data.date !== null),
  { message: 'Either dayOfWeek or date must be provided, not both' }
);
```

**Uso no API Route**:
```typescript
import { availabilityConfigSchema } from '@/lib/validations/availability-config.schema';

export async function POST(request: Request) {
  const body = await request.json();
  
  const validation = availabilityConfigSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Validation failed',
        details: validation.error.format()
      },
      { status: 400 }
    );
  }

  const validatedData = validation.data;
  
  // Continuar com dados validados...
}
```

**Benefícios do Zod**:
- ✅ Validação client e server com mesmo schema
- ✅ Type inference automática (TypeScript)
- ✅ Validações complexas (refine, superRefine)
- ✅ Mensagens de erro customizáveis

---

## 📄 Padrão de Tratamento de Erros

### Categorização de Erros

| Tipo de Erro | Status | Quando Usar |
|--------------|--------|-------------|
| **Validation Error** | 400 | Dados inválidos, campos faltando, formato errado |
| **Unauthorized** | 401 | Usuário não autenticado |
| **Forbidden** | 403 | Usuário autenticado mas sem permissão |
| **Not Found** | 404 | Recurso não existe |
| **Conflict** | 409 | Unique constraint, capacidade insuficiente, lógica de negócio |
| **Internal Error** | 500 | Exceções não tratadas, falhas no banco |

---

### Handler de Erros Prisma

```typescript
try {
  await prisma.customer.create({ data: { email } });
} catch (error: any) {
  // Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'unknown';
    return NextResponse.json(
      { success: false, error: `${field} already exists` },
      { status: 409 }
    );
  }

  // Foreign key constraint
  if (error.code === 'P2003') {
    return NextResponse.json(
      { success: false, error: 'Referenced record does not exist' },
      { status: 404 }
    );
  }

  // Record not found (findUniqueOrThrow)
  if (error.code === 'P2025') {
    return NextResponse.json(
      { success: false, error: 'Record not found' },
      { status: 404 }
    );
  }

  // Generic Prisma error
  console.error('[Prisma Error]', error);
  throw error;  // Re-throw para catch externo
}
```

**Códigos Prisma comuns**:
- `P2002` — Unique constraint violation
- `P2003` — Foreign key constraint failed
- `P2025` — Record not found

---

## 🎨 Padrão de Componentes React

### Component Structure

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  initialValue: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}

export function MyComponent({
  initialValue,
  onSave,
  disabled = false
}: MyComponentProps) {
  // 1. State
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  // 2. Effects
  useEffect(() => {
    // Reset value quando prop mudar
    setValue(initialValue);
  }, [initialValue]);

  // 3. Handlers
  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(value);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 4. Render
  return (
    <div className="p-4">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={disabled || loading}
        className="border rounded px-2 py-1"
      />
      <Button
        onClick={handleSave}
        disabled={disabled || loading}
      >
        {loading ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}
```

### Checklist de Componente

✅ Tipagem explícita de Props  
✅ Props opcionais com valores default  
✅ Estados locais bem nomeados  
✅ Effects com dependencies corretas  
✅ Loading states para operações assíncronas  
✅ Error handling em handlers  
✅ Disabled states durante loading  
✅ Tailwind classes inline (sem CSS modules)  

---

## 🪝 Padrão de Hooks Personalizados

### Template de Hook

```typescript
import { useState, useEffect } from 'react';

interface UseMyFeatureOptions {
  autoLoad?: boolean;
}

export function useMyFeature(options: UseMyFeatureOptions = {}) {
  const { autoLoad = true } = options;

  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load function
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/my-endpoint');
      const json = await response.json();
      
      if (!json.success) {
        throw new Error(json.error);
      }
      
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad]);

  // Public API
  return {
    data,
    loading,
    error,
    reload: loadData,
  };
}
```

### Checklist de Hook

✅ Prefixo `use` no nome  
✅ Estado para `data`, `loading`, `error`  
✅ Funções de ação retornadas (reload, create, update, delete)  
✅ Options object para configuração  
✅ Auto-load opcional com useEffect  
✅ Error handling consistente  
✅ Return object com API clara  

---

## 🗂️ Convenções de Nomenclatura

### Arquivos

| Tipo | Pattern | Exemplo |
|------|---------|---------|
| API Route | `route.ts` | `/api/bookings/route.ts` |
| Page | `page.tsx` | `/dashboard/page.tsx` |
| Component | `PascalCase.tsx` | `BookingCard.tsx` |
| Hook | `use-kebab-case.ts` | `use-bookings.ts` |
| Service | `kebab-case-service.ts` | `timeslot-service.ts` |
| Util | `kebab-case.ts` | `format-date.ts` |
| Schema | `kebab-case.schema.ts` | `booking.schema.ts` |

---

### Variáveis e Funções

```typescript
// ✅ BOM
const userBookings = [];
const totalRevenue = 0;
async function createBooking() {}
const handleSubmit = () => {};

// ❌ EVITAR
const ub = [];  // Não abreviar
const total = 0;  // Ambíguo
function cb() {}  // Não claro
```

**Regras**:
- ✅ camelCase para variáveis e funções
- ✅ PascalCase para components e classes
- ✅ UPPER_SNAKE_CASE para constantes
- ✅ Nomes descritivos (sem abreviações obscuras)

---

### Interfaces e Types

```typescript
// ✅ BOM
interface BookingData {
  id: string;
  customerId: string;
  // ...
}

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

interface UseBookingsOptions {
  autoLoad?: boolean;
}

// ❌ EVITAR
interface IBooking {}  // Não usar prefixo I
type booking = {};     // Pascal case obrigatório
```

---

## 📦 Import Order

```typescript
// 1. React e Next.js
import { useState, useEffect } from 'react';
import { NextResponse } from 'next/server';

// 2. Bibliotecas externas
import { z } from 'zod';

// 3. Aliases internos (@/)
import { getCurrentUser } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

// 4. Relativos
import { MyLocalComponent } from './MyLocalComponent';
import type { MyLocalType } from './types';
```

---

## 🔗 Referências Relacionadas

- **Database**: [DATABASE.md](./DATABASE.md) — Modelos Prisma
- **APIs**: [API_REFERENCE.md](./API_REFERENCE.md) — Exemplos de endpoints
- **Frontend**: [FRONTEND.md](./FRONTEND.md) — Padrões de componentes
- **Auth**: [AUTHENTICATION.md](./AUTHENTICATION.md) — getCurrentUser()
- **Booking System**: [BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md) — Lógica transacional

---

**Última atualização**: 9 de abril de 2026
