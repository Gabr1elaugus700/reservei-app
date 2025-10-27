import { prisma } from './prisma';

export interface WeeklyCapacityData {
  dayOfWeek: number;
  limit: number;
  enabled: boolean;
}

export interface SpecialDateCapacityData {
  date: string;
  limit: number;
  description?: string;
}

export interface CapacityConfiguration {
  weeklyCapacities: WeeklyCapacityData[];
  specialDates: SpecialDateCapacityData[];
}

class CapacityService {
  // Buscar configurações de capacidade por tenant
  async getCapacityConfiguration(tenantId: string): Promise<CapacityConfiguration> {
    const [weeklyCapacities, specialDates] = await Promise.all([
      prisma.weeklyCapacity.findMany({
        where: { tenantId },
        orderBy: { dayOfWeek: 'asc' }
      }),
      prisma.specialDateCapacity.findMany({
        where: { tenantId },
        orderBy: { date: 'asc' }
      })
    ]);

    return {
      weeklyCapacities: weeklyCapacities.map(wc => ({
        dayOfWeek: wc.dayOfWeek,
        limit: wc.limit,
        enabled: wc.enabled
      })),
      specialDates: specialDates.map(sd => ({
        date: sd.date.toISOString().split('T')[0],
        limit: sd.limit,
        description: sd.description || undefined
      }))
    };
  }

  // Salvar configurações de capacidade semanal
  async saveWeeklyCapacities(tenantId: string, weeklyCapacities: WeeklyCapacityData[]): Promise<void> {
    // Usar transaction para garantir consistência
    await prisma.$transaction(async (tx) => {
      // Remover configurações existentes
      await tx.weeklyCapacity.deleteMany({
        where: { tenantId }
      });

      // Inserir novas configurações
      await tx.weeklyCapacity.createMany({
        data: weeklyCapacities.map(wc => ({
          tenantId,
          dayOfWeek: wc.dayOfWeek,
          limit: wc.limit,
          enabled: wc.enabled
        }))
      });
    });
  }

  // Salvar configurações de datas especiais
  async saveSpecialDates(tenantId: string, specialDates: SpecialDateCapacityData[]): Promise<void> {
    // Usar transaction para garantir consistência
    await prisma.$transaction(async (tx) => {
      // Remover configurações existentes
      await tx.specialDateCapacity.deleteMany({
        where: { tenantId }
      });

      // Inserir novas configurações
      if (specialDates.length > 0) {
        await tx.specialDateCapacity.createMany({
          data: specialDates.map(sd => ({
            tenantId,
            date: new Date(sd.date),
            limit: sd.limit,
            description: sd.description || null
          }))
        });
      }
    });
  }

  // Salvar configurações completas (semanal + datas especiais)
  async saveCapacityConfiguration(tenantId: string, config: CapacityConfiguration): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Salvar capacidades semanais
      await tx.weeklyCapacity.deleteMany({ where: { tenantId } });
      await tx.weeklyCapacity.createMany({
        data: config.weeklyCapacities.map(wc => ({
          tenantId,
          dayOfWeek: wc.dayOfWeek,
          limit: wc.limit,
          enabled: wc.enabled
        }))
      });

      // Salvar datas especiais
      await tx.specialDateCapacity.deleteMany({ where: { tenantId } });
      if (config.specialDates.length > 0) {
        await tx.specialDateCapacity.createMany({
          data: config.specialDates.map(sd => ({
            tenantId,
            date: new Date(sd.date),
            limit: sd.limit,
            description: sd.description || null
          }))
        });
      }
    });
  }

  // Adicionar uma data especial
  async addSpecialDate(tenantId: string, specialDate: SpecialDateCapacityData): Promise<void> {
    await prisma.specialDateCapacity.create({
      data: {
        tenantId,
        date: new Date(specialDate.date),
        limit: specialDate.limit,
        description: specialDate.description || null
      }
    });
  }

  // Remover uma data especial
  async removeSpecialDate(tenantId: string, date: string): Promise<void> {
    await prisma.specialDateCapacity.deleteMany({
      where: {
        tenantId,
        date: new Date(date)
      }
    });
  }

  // Atualizar uma data especial
  async updateSpecialDate(tenantId: string, date: string, updates: Partial<SpecialDateCapacityData>): Promise<void> {
    const updateData: { limit?: number; description?: string | null } = {};
    
    if (updates.limit !== undefined) updateData.limit = updates.limit;
    if (updates.description !== undefined) updateData.description = updates.description;

    await prisma.specialDateCapacity.updateMany({
      where: {
        tenantId,
        date: new Date(date)
      },
      data: updateData
    });
  }

  // Obter limite para uma data específica
  async getCapacityForDate(tenantId: string, date: string): Promise<number | null> {
    // Verificar se existe configuração para data específica
    const specialDate = await prisma.specialDateCapacity.findFirst({
      where: {
        tenantId,
        date: new Date(date)
      }
    });

    if (specialDate) {
      return specialDate.limit;
    }

    // Se não existe data especial, buscar configuração do dia da semana
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const weeklyCapacity = await prisma.weeklyCapacity.findUnique({
      where: {
        tenantId_dayOfWeek: {
          tenantId,
          dayOfWeek
        }
      }
    });

    return weeklyCapacity?.enabled ? weeklyCapacity.limit : null;
  }

  // Inicializar configurações padrão para um tenant
  async initializeDefaultCapacities(tenantId: string): Promise<void> {
    const defaultWeeklyCapacities: WeeklyCapacityData[] = [
      { dayOfWeek: 0, limit: 20, enabled: true }, // Domingo
      { dayOfWeek: 1, limit: 30, enabled: true }, // Segunda
      { dayOfWeek: 2, limit: 30, enabled: true }, // Terça
      { dayOfWeek: 3, limit: 30, enabled: true }, // Quarta
      { dayOfWeek: 4, limit: 30, enabled: true }, // Quinta
      { dayOfWeek: 5, limit: 35, enabled: true }, // Sexta
      { dayOfWeek: 6, limit: 40, enabled: true }  // Sábado
    ];

    // Verificar se já existem configurações
    const existingCount = await prisma.weeklyCapacity.count({
      where: { tenantId }
    });

    if (existingCount === 0) {
      await this.saveWeeklyCapacities(tenantId, defaultWeeklyCapacities);
    }
  }
}

export const capacityService = new CapacityService();