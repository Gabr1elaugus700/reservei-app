-- Script para remover slots duplicados antes de aplicar a constraint UNIQUE
-- Mantém apenas o slot mais recente (por createdAt) para cada combinação (date, startTime)

-- Verificar quantas duplicatas existem
SELECT 
  date, 
  "startTime", 
  COUNT(*) as count,
  string_agg(id::text, ', ') as slot_ids
FROM "TimeSlot" 
WHERE date IS NOT NULL
GROUP BY date, "startTime" 
HAVING COUNT(*) > 1;

-- Se houver duplicatas, executar esta query para removê-las:
-- DELETE FROM "TimeSlot" t1
-- USING "TimeSlot" t2
-- WHERE t1.date = t2.date 
--   AND t1."startTime" = t2."startTime"
--   AND t1."createdAt" < t2."createdAt";

-- Verificar novamente (não deve retornar nada)
-- SELECT date, "startTime", COUNT(*) 
-- FROM "TimeSlot" 
-- WHERE date IS NOT NULL
-- GROUP BY date, "startTime" 
-- HAVING COUNT(*) > 1;
