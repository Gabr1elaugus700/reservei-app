// Script para limpar slots duplicados antes de aplicar a migration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🔍 Verificando duplicatas de TimeSlot...\n');

  // Encontrar slots duplicados (mesma data e startTime)
  const duplicates = await prisma.$queryRaw<Array<{
    date: Date;
    startTime: string;
    count: bigint;
    slot_ids: string;
  }>>`
    SELECT 
      date, 
      "startTime", 
      COUNT(*) as count,
      string_agg(id, ', ') as slot_ids
    FROM "TimeSlot" 
    WHERE date IS NOT NULL
    GROUP BY date, "startTime" 
    HAVING COUNT(*) > 1
    ORDER BY date, "startTime"
  `;

  if (duplicates.length === 0) {
    console.log('✅ Nenhuma duplicata encontrada! Banco está limpo.\n');
    return;
  }

  console.log(`⚠️  Encontradas ${duplicates.length} duplicatas:\n`);
  duplicates.forEach(dup => {
    console.log(`  📅 ${dup.date.toISOString().split('T')[0]} às ${dup.startTime}: ${dup.count} slots (IDs: ${dup.slot_ids})`);
  });

  console.log('\n🧹 Removendo duplicatas (mantendo apenas o mais recente)...\n');

  // Remover duplicatas (manter apenas o slot mais recente)
  const result = await prisma.$executeRaw`
    DELETE FROM "TimeSlot" t1
    USING "TimeSlot" t2
    WHERE t1.date = t2.date 
      AND t1."startTime" = t2."startTime"
      AND t1."createdAt" < t2."createdAt"
  `;

  console.log(`✅ ${result} slots duplicados removidos.\n`);

  // Verificar novamente
  const remaining = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM (
      SELECT date, "startTime"
      FROM "TimeSlot"
      WHERE date IS NOT NULL
      GROUP BY date, "startTime"
      HAVING COUNT(*) > 1
    ) duplicates
  `;

  if (Number(remaining[0]?.count || 0) === 0) {
    console.log('✅ Limpeza concluída! Todas as duplicatas foram removidas.');
    console.log('\n👉 Agora execute: npx prisma migrate dev --name add_unique_constraint_to_timeslot\n');
  } else {
    console.log('⚠️  Ainda há duplicatas. Verifique manualmente.');
  }
}

cleanupDuplicates()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
