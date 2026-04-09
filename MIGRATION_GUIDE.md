# Implementação da Correção de Duplicação de Slots - Próximos Passos

## ✅ Código Implementado

As seguintes alterações foram aplicadas ao código:

### 1. Schema Prisma - Constraint UNIQUE
**Arquivo:** `prisma/schema.prisma`
- ✅ Adicionado `@@unique([date, startTime], name: "unique_slot_per_date_time")` ao modelo TimeSlot

### 2. Backend - Correção de Race Condition
**Arquivo:** `src/lib/timeslot-service.ts`
- ✅ Substituído `Promise.all` com múltiplos `create()` por `createMany()` com `skipDuplicates: true`
- ✅ Adicionados logs de debugging
- ✅ Ajustado retorno para buscar slots finais do banco

### 3. Frontend - Associação por ID
**Arquivo:** `src/hooks/bookingsHook.ts`
- ✅ Adicionado campo `timeSlotId?: string` à interface Booking
- ✅ Corrigida lógica de agrupamento para usar `booking.timeSlotId === slot.id`
- ✅ Mantido fallback para bookings antigos sem timeSlotId

### 4. Backend - Verificação de Duplicatas no POST
**Arquivo:** `src/app/api/availability-configs/route.ts`
- ✅ POST agora verifica se configuração já existe antes de criar
- ✅ Se existir, atualiza (upsert pattern)
- ✅ Previne criação de múltiplas configs para mesma data

### 5. Frontend - Correção de Timezone na Busca
**Arquivo:** `src/app/features/booking/Capacity/page.tsx`
- ✅ Corrigida comparação de datas sem conversão UTC→Local
- ✅ Compara strings YYYY-MM-DD diretamente
- ✅ Adicionados logs de debug

### 6. Backend - Serialização Consistente de Datas
**Arquivos:** `src/lib/date-serializer.ts`, APIs de availability-configs e timeslots
- ✅ Criado módulo `date-serializer.ts` com funções auxiliares
- ✅ Todas as APIs retornam datas como `YYYY-MM-DD` (sem timezone)
- ✅ Parse de datas usa `new Date(y, m-1, d)` (local, sem conversão UTC)
- ✅ **Servidor em UTC ou qualquer timezone não afeta comparações**

## 🔧 Passos Pendentes (Executar Manualmente)

### Passo 1: Limpar Duplicatas do Banco (SE EXISTIREM)

Execute o script de limpeza:

```powershell
npx tsx cleanup-duplicates.ts
```

OU execute manualmente no PostgreSQL:

```sql
-- Verificar duplicatas
SELECT 
  date, 
  "startTime", 
  COUNT(*) as count,
  string_agg(id, ', ') as slot_ids
FROM "TimeSlot" 
WHERE date IS NOT NULL
GROUP BY date, "startTime" 
HAVING COUNT(*) > 1;

-- Remover duplicatas (manter apenas o mais recente)
DELETE FROM "TimeSlot" t1
USING "TimeSlot" t2
WHERE t1.date = t2.date 
  AND t1."startTime" = t2."startTime"
  AND t1."createdAt" < t2."createdAt";
```

### Passo 2: Criar e Aplicar Migration

Responda 'y' quando o Prisma perguntar:

```powershell
npx prisma migrate dev --name add_unique_constraint_to_timeslot
```

### Passo 3: Atualizar API de Bookings (IMPORTANTE)

A API de criação de bookings precisa gravar o `timeSlotId` no banco. Verifique o arquivo:
- `src/app/api/bookings/route.ts` ou similar

Certifique-se de que ao criar um booking, o campo `timeSlotId` seja incluído:

```typescript
const booking = await prisma.booking.create({
  data: {
    // ... outros campos
    timeSlotId: timeSlot.id, // ← NECESSÁRIO
    time: slot.startTime,    // mantém para compatibilidade
    // ...
  }
});
```

### Passo 4: Testar o Fluxo Completo

1. **Criar configuração de data específica:**
   - Acesse o painel de capacidade
   - Configure uma data específica com horários
   - Salve a configuração

2. **Verificar no banco:**
   ```sql
   SELECT date, "startTime", COUNT(*) 
   FROM "TimeSlot" 
   WHERE date = '2026-XX-XX'  -- data configurada
   GROUP BY date, "startTime";
   ```
   - Deve retornar apenas 1 linha por horário

3. **Criar um booking:**
   - Crie um agendamento para um dos slots
   - Verifique que aparece em apenas 1 slot (não duplicado)

4. **Verificar timeSlotId:**
   ```sql
   SELECT id, "timeSlotId", time, date 
   FROM "Booking" 
   ORDER BY "createdAt" DESC 
   LIMIT 5;
   ```
   - Novos bookings devem ter `timeSlotId` preenchido

## 🎯 Resultado Esperado

Após completar todos os passos:

✅ Constraint UNIQUE impedirá criação de slots duplicados no banco  
✅ `createMany` com `skipDuplicates` evitará race conditions  
✅ Bookings associados por `timeSlotId` aparecerão em apenas 1 slot  
✅ Sistema funcionará normalmente sem duplicações

## 🐛 Se Houver Problemas

### Migration falha com erro de duplicatas:
- Execute o Passo 1 novamente
- Verifique manualmente no banco se ainda há duplicatas

### Bookings aparecem em vários slots:
- Verifique se o campo `timeSlotId` está sendo gravado na criação de novos bookings
- Bookings antigos ainda usarão `time` (fallback)

### Slots não aparecem após salvar:
- Verifique logs do console do navegador
- Verifique logs do servidor Next.js
- Confirme que a migration foi aplicada: `npx prisma migrate status`

## 📝 Arquivos Auxiliares Criados

- `cleanup-duplicates.ts` - Script Node.js para limpar duplicatas
- `fix-duplicates.sql` - SQL manual para limpeza
- `MIGRATION_GUIDE.md` - Este arquivo

## 🔍 Monitoramento

Após deployment em produção, monitore:

1. Logs do servidor buscando por:
   - `[syncTimeSlotsForConfig] Criando X novos slots`
   - `[syncTimeSlotsForConfig] X slots criados com sucesso`

2. Erros P2002 (violação de unique constraint) - isso é ESPERADO e CORRETO
   - Indica que o sistema tentou criar duplicata e foi bloqueado

3. Queries lentas ou timeouts na criação de configurações

## ℹ️ Informações Técnicas

**Root Cause:**
1. Backend criava duplicatas via race condition em `Promise.all`
2. Frontend associava bookings por `startTime` ao invés de ID
3. Sem constraint UNIQUE, duplicatas persistiam no banco
4. **CRÍTICO**: Busca de configurações falhava por problemas de timezone

**Problema de Timezone:**
- Servidor pode rodar em UTC (ou qualquer timezone internacional)
- `new Date("2026-04-09")` cria `2026-04-09T00:00:00Z` (midnight UTC)
- Ao converter para timezone local (ex: Brasil UTC-3), vira `2026-04-08T21:00:00`
- Comparação `getFullYear()`, `getMonth()`, `getDate()` retorna DIA ERRADO
- Resultado: configuração não é encontrada → cria duplicata

**Solução (5 camadas):**
1. **DB**: Constraint UNIQUE `[date, startTime]`
2. **Backend**: `createMany` com `skipDuplicates`
3. **Backend API**: Serializa Date como string `YYYY-MM-DD` (sem timezone)
4. **Backend Upsert**: POST verifica se config existe antes de criar
5. **Frontend**: Compara strings `YYYY-MM-DD` diretamente (sem conversão)

**Módulo date-serializer.ts:**
```typescript
// Sempre extrai componentes locais (ignora timezone)
serializeDate(date) → "YYYY-MM-DD"
parseDate("YYYY-MM-DD") → new Date(year, month-1, day)
```

**Compatibilidade:**
- Bookings antigos sem `timeSlotId` continuam funcionando (fallback)
- Novos bookings devem gravar `timeSlotId`
- Gradualmente todos terão ID à medida que são criados
- **Independente do timezone do servidor**: datas sempre YYYY-MM-DD

---

**Data de Implementação:** 2026-04-09  
**Última Atualização:** 2026-04-09
