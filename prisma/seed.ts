import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Garantir usuário admin padrão
  const adminEmail = 'admin@admin.com';
  const adminName =  'administrador' ;
  const adminPassword = 'admin';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        emailVerified: true,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: 'email',
        accountId: adminEmail,
        password: passwordHash,
      },
    });

    console.log(`✔ Admin criado: ${adminEmail} (senha: ${adminPassword})`);
  } else {
    console.log(`ℹ Admin já existe: ${adminEmail}`);
  }

  // Criar capacidades semanais padrão (global)
  const weeklyCapacities = [
    { dayOfWeek: 0, limit: 20, enabled: true }, // Domingo
    { dayOfWeek: 1, limit: 30, enabled: true }, // Segunda
    { dayOfWeek: 2, limit: 30, enabled: true }, // Terça
    { dayOfWeek: 3, limit: 30, enabled: true }, // Quarta
    { dayOfWeek: 4, limit: 30, enabled: true }, // Quinta
    { dayOfWeek: 5, limit: 35, enabled: true }, // Sexta
    { dayOfWeek: 6, limit: 40, enabled: true }, // Sábado
  ];

  for (const capacity of weeklyCapacities) {
    await prisma.weeklyCapacity.upsert({
      where: { dayOfWeek: capacity.dayOfWeek },
      update: { limit: capacity.limit, enabled: capacity.enabled },
      create: {
        dayOfWeek: capacity.dayOfWeek,
        limit: capacity.limit,
        enabled: capacity.enabled,
      },
    });
  }

  // Criar algumas datas especiais de exemplo (global)
  const specialDates = [
    {
      date: new Date('2025-12-25'),
      limit: 0,
      description: 'Natal - Fechado',
    },
    {
      date: new Date('2025-12-31'),
      limit: 50,
      description: 'Reveillon - Capacidade especial',
    },
    {
      date: new Date('2025-01-01'),
      limit: 0,
      description: 'Ano Novo - Fechado',
    },
  ];

  for (const specialDate of specialDates) {
    await prisma.specialDateCapacity.upsert({
      where: { date: specialDate.date },
      update: {
        limit: specialDate.limit,
        description: specialDate.description,
      },
      create: {
        date: specialDate.date,
        limit: specialDate.limit,
        description: specialDate.description,
      },
    });
  }

  console.log('Configurações de capacidade globais criadas/atualizadas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
