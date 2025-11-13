# Arquitetura de Hooks - Sistema de Agendamentos

## Hook: `useAvailabilitySchedule`

### Objetivo
Gerenciar a configuração semanal de horários e disponibilidade para agendamentos.

### Fluxo do Usuário

```
1. Configurar Dias da Semana
   ├── ☑️ Domingo (desabilitado por padrão)
   ├── ✅ Segunda-feira (habilitado)
   │   ├── Horário: 09:00 - 18:00
   │   ├── Duração do Slot: 30 minutos
   │   ├── Capacidade por Slot: 20 pessoas
   │   └── Pausas:
   │       ├── 12:00 - 13:00 (Almoço)
   │       └── 15:00 - 15:30 (Lanche)
   ├── ✅ Terça-feira (habilitado)
   └── ...

2. Backend Gera Automaticamente
   ├── TimeSlots baseados na configuração
   │   ├── Segunda 09:00 (20 vagas)
   │   ├── Segunda 09:30 (20 vagas)
   │   ├── Segunda 10:00 (20 vagas)
   │   ├── [PAUSA 12:00-13:00] ❌
   │   ├── Segunda 13:00 (20 vagas)
   │   └── ...
   └── Slots disponíveis para agendamento
```

### Estrutura de Dados

```typescript
interface DayConfig {
  dayOfWeek: number;        // 0-6 (Domingo-Sábado)
  name: string;             // "Segunda-feira"
  shortName: string;        // "Seg"
  enabled: boolean;         // Dia ativo?
  startTime: string;        // "09:00"
  endTime: string;          // "18:00"
  slotDurationMinutes: number;  // 30
  capacityPerSlot: number;  // 20
  breakPeriods: BreakPeriod[];  // Pausas
}

interface BreakPeriod {
  id: string;               // "break-1234567890"
  startTime: string;        // "12:00"
  endTime: string;          // "13:00"
}
```

### Métodos Disponíveis

#### `toggleDay(dayOfWeek: number)`
Ativa/desativa um dia da semana para agendamentos.

```typescript
// Desabilitar domingos
toggleDay(0);
```

#### `updateDayField(dayOfWeek, field, value)`
Atualiza configurações de um dia específico.

```typescript
// Mudar horário de início da segunda-feira
updateDayField(1, 'startTime', '08:00');

// Mudar duração dos slots
updateDayField(1, 'slotDurationMinutes', 45);

// Mudar capacidade
updateDayField(1, 'capacityPerSlot', 30);
```

#### `addBreakPeriod(dayOfWeek: number)`
Adiciona período de pausa em um dia.

```typescript
// Adicionar pausa na segunda-feira
addBreakPeriod(1);
```

#### `removeBreakPeriod(dayOfWeek, breakId)`
Remove período de pausa.

```typescript
removeBreakPeriod(1, 'break-1234567890');
```

#### `updateBreakPeriod(dayOfWeek, breakId, field, value)`
Atualiza horários de uma pausa.

```typescript
// Ajustar horário de almoço
updateBreakPeriod(1, 'break-1234567890', 'startTime', '12:30');
updateBreakPeriod(1, 'break-1234567890', 'endTime', '13:30');
```

#### `saveWeeklySchedule()`
Salva toda a configuração semanal no backend.

```typescript
const success = await saveWeeklySchedule();
if (success) {
  console.log('Slots gerados automaticamente no backend!');
}
```

### Fluxo Backend

```
POST /api/availability-configs/bulk
  ↓
Validação com Zod Schema
  ↓
Criar/Atualizar AvailabilityConfig (por dia)
  ↓
Trigger: Gerar TimeSlots automaticamente
  ↓
Cálculo:
  - Slots = (endTime - startTime - pausas) / slotDuration
  - Cada slot tem capacityPerSlot vagas
  ↓
Persistir TimeSlots no banco
  ↓
Retornar sucesso
```

### Exemplo de Uso no Componente

```typescript
function ConfiguracaoSemanal() {
  const {
    weekConfig,
    loading,
    saving,
    toggleDay,
    updateDayField,
    addBreakPeriod,
    saveWeeklySchedule,
  } = useAvailabilitySchedule();

  if (loading) return <Spinner />;

  return (
    <div>
      {weekConfig.map((day) => (
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
              <input
                type="number"
                value={day.slotDurationMinutes}
                onChange={(e) => 
                  updateDayField(day.dayOfWeek, 'slotDurationMinutes', +e.target.value)
                }
              />
              <input
                type="number"
                value={day.capacityPerSlot}
                onChange={(e) => 
                  updateDayField(day.dayOfWeek, 'capacityPerSlot', +e.target.value)
                }
              />

              <button onClick={() => addBreakPeriod(day.dayOfWeek)}>
                + Adicionar Pausa
              </button>

              {day.breakPeriods.map((break) => (
                <div key={break.id}>
                  <input type="time" value={break.startTime} />
                  <input type="time" value={break.endTime} />
                </div>
              ))}
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

### Validação (Zod Schema)

```typescript
// src/lib/validations/availability-config.ts
export const availabilityConfigSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.number().min(1).default(30),
  capacityPerSlot: z.number().min(1).default(1),
  isException: z.boolean().default(false),
  isActive: z.boolean().default(true),
  breakPeriods: z.array(z.object({
    id: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
});
```

## Diferença: Configuração vs Slots

| Conceito | Descrição | Gerenciado por |
|----------|-----------|----------------|
| **AvailabilityConfig** | Configuração geral do dia (horários, durações) | Admin via Hook |
| **TimeSlot** | Slot individual para agendamento (09:00, 09:30...) | Backend automaticamente |
| **Booking** | Reserva efetiva de um cliente em um slot | Cliente via sistema |

## Extensões Futuras

### 1. Datas Especiais (Exceções)
```typescript
// Exemplo: Feriado ou evento especial
const addSpecialDate = (date: Date, config: Partial<DayConfig>) => {
  // Cria AvailabilityConfig com isException: true
  // Sobrescreve configuração padrão para aquela data
};
```

### 2. Múltiplos Períodos por Dia
```typescript
// Exemplo: Manhã (09-12) e Tarde (14-18)
interface DayConfig {
  periods: Array<{
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    capacityPerSlot: number;
  }>;
}
```

### 3. Capacidade Dinâmica por Horário
```typescript
// Exemplo: Mais slots no almoço
interface TimeBasedCapacity {
  time: string;
  capacity: number;
}
```
