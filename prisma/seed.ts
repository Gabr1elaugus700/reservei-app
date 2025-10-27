import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar tenant padrão
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Tenant Padrão',
      slug: 'default',
      theme: {
        primary: '#3b82f6',
        primaryForeground: '#ffffff',
        secondary: '#f1f5f9',
        secondaryForeground: '#0f172a',
        accent: '#f1f5f9',
        accentForeground: '#0f172a',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f1f5f9',
        mutedForeground: '#64748b',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#3b82f6',
        destructive: '#ef4444',
        destructiveForeground: '#ffffff',
        success: '#10b981',
        successForeground: '#ffffff',
        warning: '#f59e0b',
        warningForeground: '#ffffff',
      }
    },
  });

  // Criar tenant empresa A
  const empresaA = await prisma.tenant.upsert({
    where: { slug: 'empresa-a' },
    update: {},
    create: {
      name: 'Empresa A',
      slug: 'empresa-a',
      theme: {
        primary: '#059669',
        primaryForeground: '#ffffff',
        secondary: '#dcfce7',
        secondaryForeground: '#14532d',
        accent: '#dcfce7',
        accentForeground: '#14532d',
        background: '#ffffff',
        foreground: '#14532d',
        muted: '#f1f5f9',
        mutedForeground: '#64748b',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#059669',
        destructive: '#dc2626',
        destructiveForeground: '#ffffff',
        success: '#059669',
        successForeground: '#ffffff',
        warning: '#d97706',
        warningForeground: '#ffffff',
      }
    },
  });

  // Criar tenant empresa B
  const empresaB = await prisma.tenant.upsert({
    where: { slug: 'empresa-b' },
    update: {},
    create: {
      name: 'Empresa B',
      slug: 'empresa-b',
      theme: {
        primary: '#7c3aed',
        primaryForeground: '#ffffff',
        secondary: '#ede9fe',
        secondaryForeground: '#581c87',
        accent: '#ede9fe',
        accentForeground: '#581c87',
        background: '#ffffff',
        foreground: '#581c87',
        muted: '#f1f5f9',
        mutedForeground: '#64748b',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#7c3aed',
        destructive: '#dc2626',
        destructiveForeground: '#ffffff',
        success: '#059669',
        successForeground: '#ffffff',
        warning: '#d97706',
        warningForeground: '#ffffff',
      }
    },
  });

  console.log('Tenants criados:');
  console.log('- Default:', defaultTenant);
  console.log('- Empresa A:', empresaA);
  console.log('- Empresa B:', empresaB);

  // Criar configurações de capacidade padrão para cada tenant
  const tenants = [defaultTenant, empresaA, empresaB];

  for (const tenant of tenants) {
    // Criar capacidades semanais padrão
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
        where: {
          tenantId_dayOfWeek: {
            tenantId: tenant.id,
            dayOfWeek: capacity.dayOfWeek,
          },
        },
        update: {
          limit: capacity.limit,
          enabled: capacity.enabled,
        },
        create: {
          tenantId: tenant.id,
          dayOfWeek: capacity.dayOfWeek,
          limit: capacity.limit,
          enabled: capacity.enabled,
        },
      });
    }

    // Criar algumas datas especiais de exemplo
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
        where: {
          tenantId_date: {
            tenantId: tenant.id,
            date: specialDate.date,
          },
        },
        update: {
          limit: specialDate.limit,
          description: specialDate.description,
        },
        create: {
          tenantId: tenant.id,
          date: specialDate.date,
          limit: specialDate.limit,
          description: specialDate.description,
        },
      });
    }

    console.log(`Configurações de capacidade criadas para ${tenant.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });