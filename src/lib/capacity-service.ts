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
  async getCapacityConfiguration(): Promise<CapacityConfiguration> {
    const [weeklyCapacities, specialDates] = await Promise.all([
      prisma.weeklyCapacity.findMany({ orderBy: { dayOfWeek: 'asc' } }),
      prisma.specialDateCapacity.findMany({ orderBy: { date: 'asc' } })
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

  async saveWeeklyCapacities(weeklyCapacities: WeeklyCapacityData[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.weeklyCapacity.deleteMany({});

      await tx.weeklyCapacity.createMany({
        data: weeklyCapacities.map(wc => ({
          dayOfWeek: wc.dayOfWeek,
          limit: wc.limit,
          enabled: wc.enabled
        }))
      });
    });
  }

  async saveSpecialDates(specialDates: SpecialDateCapacityData[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.specialDateCapacity.deleteMany({});

      if (specialDates.length > 0) {
        await tx.specialDateCapacity.createMany({
          data: specialDates.map(sd => ({
            date: new Date(sd.date),
            limit: sd.limit,
            description: sd.description || null
          }))
        });
      }
    });
  }

  async saveCapacityConfiguration(config: CapacityConfiguration): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.weeklyCapacity.deleteMany({});
      await tx.weeklyCapacity.createMany({
        data: config.weeklyCapacities.map(wc => ({
          dayOfWeek: wc.dayOfWeek,
          limit: wc.limit,
          enabled: wc.enabled
        }))
      });

      await tx.specialDateCapacity.deleteMany({});
      if (config.specialDates.length > 0) {
        await tx.specialDateCapacity.createMany({
          data: config.specialDates.map(sd => ({
            date: new Date(sd.date),
            limit: sd.limit,
            description: sd.description || null
          }))
        });
      }
    });
  }

  async addSpecialDate(specialDate: SpecialDateCapacityData): Promise<void> {
    await prisma.specialDateCapacity.create({
      data: {
        date: new Date(specialDate.date),
        limit: specialDate.limit,
        description: specialDate.description || null
      }
    });
  }

  async removeSpecialDate(date: string): Promise<void> {
    await prisma.specialDateCapacity.deleteMany({
      where: { date: new Date(date) }
    });
  }

  async updateSpecialDate(date: string, updates: Partial<SpecialDateCapacityData>): Promise<void> {
    const updateData: { limit?: number; description?: string | null } = {};
    if (updates.limit !== undefined) updateData.limit = updates.limit;
    if (updates.description !== undefined) updateData.description = updates.description ?? null;

    await prisma.specialDateCapacity.updateMany({
      where: { date: new Date(date) },
      data: updateData
    });
  }

  async getCapacityForDate(date: string): Promise<number | null> {
    const specialDate = await prisma.specialDateCapacity.findUnique({
      where: { date: new Date(date) }
    });

    if (specialDate) {
      return specialDate.limit;
    }

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const weeklyCapacity = await prisma.weeklyCapacity.findUnique({
      where: { dayOfWeek }
    });

    return weeklyCapacity?.enabled ? weeklyCapacity.limit : null;
  }

  async initializeDefaultCapacities(): Promise<void> {
    const existingCount = await prisma.weeklyCapacity.count();
    if (existingCount === 0) {
      const defaultWeeklyCapacities: WeeklyCapacityData[] = [
        { dayOfWeek: 0, limit: 20, enabled: true },
        { dayOfWeek: 1, limit: 30, enabled: true },
        { dayOfWeek: 2, limit: 30, enabled: true },
        { dayOfWeek: 3, limit: 30, enabled: true },
        { dayOfWeek: 4, limit: 30, enabled: true },
        { dayOfWeek: 5, limit: 35, enabled: true },
        { dayOfWeek: 6, limit: 40, enabled: true }
      ];
      await this.saveWeeklyCapacities(defaultWeeklyCapacities);
    }
  }
}

export const capacityService = new CapacityService();
