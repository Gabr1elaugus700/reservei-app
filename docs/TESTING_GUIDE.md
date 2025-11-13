# 🧪 Guia de Teste - Sistema de Agendamentos

## Pré-requisitos

1. Banco de dados rodando
2. Migração aplicada (já feita)
3. Servidor Next.js rodando

## Passo a Passo para Testar

### 1. Iniciar o servidor

```bash
npm run dev
```

### 2. Fazer login no sistema

Acesse: `http://localhost:3000/auth/signin`

### 3. Acessar página de configuração

Acesse: `http://localhost:3000/features/booking/Capacity`

### 4. Configurar dias da semana

**Teste básico:**

1. **Segunda-feira:**
   - ✅ Marcar checkbox "Segunda-feira"
   - Horário início: `09:00`
   - Horário fim: `18:00`
   - Duração do slot: `30`
   - Capacidade por slot: `20`
   - Clicar em "Adicionar Pausa"
     - Pausa 1: `12:00` até `13:00` (almoço)

2. **Terça-feira:**
   - ✅ Marcar checkbox
   - Horário: `08:00` - `17:00`
   - Duração: `45` minutos
   - Capacidade: `15`

3. **Quarta-feira:**
   - ✅ Marcar checkbox
   - Horário: `14:00` - `22:00` (período noturno)
   - Duração: `60` minutos
   - Capacidade: `10`
   - Pausas:
     - `18:00` até `19:00` (jantar)

4. **Domingo, Quinta, Sexta, Sábado:**
   - ❌ Deixar desmarcados (dias sem atendimento)

5. **Clicar em "Salvar Configuração"**

### 5. Verificar no banco de dados

```sql
-- Ver configurações criadas
SELECT * FROM "AvailabilityConfig"
ORDER BY "dayOfWeek";

-- Ver TimeSlots gerados
SELECT 
  "dayOfWeek",
  "startTime",
  "endTime",
  "totalCapacity",
  "availableCapacity",
  "isAvailable"
FROM "TimeSlot"
WHERE "dayOfWeek" = 1 -- Segunda-feira
ORDER BY "startTime";
```

**Resultado esperado para Segunda-feira:**
```
dayOfWeek | startTime | endTime | totalCapacity | availableCapacity | isAvailable
----------|-----------|---------|---------------|-------------------|------------
1         | 09:00     | 09:30   | 20            | 20                | true
1         | 09:30     | 10:00   | 20            | 20                | true
1         | 10:00     | 10:30   | 20            | 20                | true
...
1         | 11:30     | 12:00   | 20            | 20                | true
-- PAUSA 12:00-13:00 (sem slots)
1         | 13:00     | 13:30   | 20            | 20                | true
1         | 13:30     | 14:00   | 20            | 20                | true
...
1         | 17:30     | 18:00   | 20            | 20                | true
```

### 6. Testar edição de configuração

1. Voltar na página `/features/booking/Capacity`
2. Alterar Segunda-feira:
   - Horário fim: mudar de `18:00` para `16:00`
   - Adicionar mais uma pausa: `10:00` até `10:30` (coffee break)
3. Salvar novamente
4. Verificar que os slots foram regenerados:

```sql
SELECT COUNT(*) as total_slots
FROM "TimeSlot"
WHERE "dayOfWeek" = 1;
-- Deve ter menos slots agora (horário reduzido + mais pausa)
```

### 7. Testar desativação de dia

1. Desmarcar checkbox de Terça-feira
2. Salvar
3. Verificar que os slots foram removidos:

```sql
SELECT COUNT(*) as total_slots
FROM "TimeSlot"
WHERE "dayOfWeek" = 2;
-- Deve retornar 0
```

### 8. Testar validações

**Teste 1: Horário inválido**
- Configurar Quarta-feira:
  - Início: `18:00`
  - Fim: `09:00` (fim antes do início!)
- Tentar salvar
- **Esperado:** Mensagem de erro

**Teste 2: Pausa fora do horário**
- Configurar Quinta-feira:
  - Horário: `09:00` - `17:00`
  - Pausa: `17:30` - `18:00` (fora do horário!)
- Salvar
- **Esperado:** Slots gerados normalmente (pausa é ignorada)

## 🐛 Troubleshooting

### Erro: "breakPeriods não existe no tipo"

**Solução:** Regenerar Prisma Client
```bash
npx prisma generate
```

### Erro: "EPERM: operation not permitted"

**Solução:** Fechar VSCode e rodar novamente
```bash
# Fechar o VSCode completamente
# Abrir terminal fora do VSCode
npx prisma generate
npm run dev
```

### Slots não estão sendo gerados

**Verificar:**
```typescript
// Abrir console do navegador
// Na página de capacidade, após salvar, verificar resposta:
{
  "success": true,
  "message": "7 configuração(ões) salva(s) com sucesso",
  "data": {
    "configs": [...],
    "totalSlots": 150 // Deve ter um número aqui
  }
}
```

**Se totalSlots = 0:**
- Verificar se os dias estão marcados (enabled: true)
- Verificar se horários estão corretos
- Verificar logs no terminal do servidor

### Dados antigos aparecendo

**Limpar cache e recarregar:**
```typescript
// No console do navegador
localStorage.clear();
location.reload();
```

## ✅ Checklist de Testes

- [ ] Configurar dias da semana
- [ ] Adicionar pausas
- [ ] Remover pausas
- [ ] Editar horários
- [ ] Editar duração de slots
- [ ] Editar capacidade
- [ ] Desativar dias
- [ ] Salvar configurações
- [ ] Ver slots gerados no banco
- [ ] Testar validações
- [ ] Verificar logs no terminal
- [ ] Verificar toast de sucesso/erro

## 📊 Métricas Esperadas

Para uma configuração típica (5 dias ativos, 9h-18h, slots de 30min):

- **Configurações criadas:** 7 (uma por dia da semana)
- **Configurações ativas:** 5
- **Slots por dia:** ~18 slots (9 horas = 540 min / 30 min)
- **Total de slots:** ~90 slots

## 🔍 Como debugar

### 1. Logs do servidor

Terminal onde roda `npm run dev` mostrará:
```
✅ 7 configurações salvas
✅ 90 TimeSlots gerados
```

### 2. DevTools do navegador

**Network tab:**
- Request: `POST /api/availability-configs/bulk`
- Payload: Array de configs
- Response: success + totalSlots

**Console tab:**
- Erros de validação
- Logs do hook

### 3. Prisma Studio

```bash
npx prisma studio
```

Visualizar graficamente:
- AvailabilityConfig (7 registros)
- TimeSlot (vários registros)

## 🎯 Casos de Uso Reais

### Clínica médica
```
Segunda a Sexta: 08:00 - 18:00
Slots: 30 minutos
Capacidade: 1 (um paciente por vez)
Pausas: 12:00-14:00 (almoço)
```

### Restaurante
```
Terça a Domingo: 11:00 - 23:00
Slots: 60 minutos
Capacidade: 50 (mesas disponíveis)
Pausas: 15:00-17:00 (entre almoço e jantar)
```

### Academia
```
Segunda a Sábado: 06:00 - 22:00
Slots: 60 minutos (aulas)
Capacidade: 30 (alunos por aula)
Pausas: nenhuma
```

### Salão de beleza
```
Terça a Sábado: 09:00 - 19:00
Slots: 45 minutos
Capacidade: 3 (atendentes disponíveis)
Pausas: 12:00-13:00 (almoço)
```
