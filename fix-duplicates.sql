-- Script para verificar e remover duplicatas de TimeSlot
-- Execute este script no banco de dados PostgreSQL

-- 1. Verificar se existem duplicatas
SELECT 
  date, 
  "startTime", 
  COUNT(*) as count,
  string_agg(id, ', ') as slot_ids,
  string_agg("createdAt"::text, ', ') as created_dates
FROM "TimeSlot" 
WHERE date IS NOT NULL
GROUP BY date, "startTime" 
HAVING COUNT(*) > 1
ORDER BY date, "startTime";

-- 2. Se houver duplicatas acima, execute este comando para remover:
--    (mantém apenas o slot mais recente por createdAt)
DELETE FROM "TimeSlot" t1
USING "TimeSlot" t2
WHERE t1.date = t2.date 
  AND t1."startTime" = t2."startTime"
  AND t1."createdAt" < t2."createdAt";

-- 3. Verificar novamente - deve retornar 0 linhas
SELECT 
  date, 
  "startTime", 
  COUNT(*) as count
FROM "TimeSlot" 
WHERE date IS NOT NULL
GROUP BY date, "startTime" 
HAVING COUNT(*) > 1;
