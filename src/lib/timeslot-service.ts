import { prisma } from "./prisma";

type TransactionClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

/**
 * Converte horário HH:MM em minutos desde meia-noite
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minutos desde meia-noite em formato HH:MM
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Verifica se um horário está dentro de algum período de pausa
 */
function isInBreakPeriod(
  time: string,
  breakPeriods: Array<{ startTime: string; endTime: string }>
): boolean {
  const timeMinutes = timeToMinutes(time);

  for (const breakPeriod of breakPeriods) {
    const breakStart = timeToMinutes(breakPeriod.startTime);
    const breakEnd = timeToMinutes(breakPeriod.endTime);

    if (timeMinutes >= breakStart && timeMinutes < breakEnd) {
      return true;
    }
  }

  return false;
}

/**
 * Gera slots de horário baseado na configuração
 * Exclui automaticamente períodos de pausa
 */
export function generateTimeSlots(config: {
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  breakPeriods?: Array<{ id: string; startTime: string; endTime: string }>;
}): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  
  const startMinutes = timeToMinutes(config.startTime);
  const endMinutes = timeToMinutes(config.endTime);
  const breakPeriods = config.breakPeriods || [];

  let currentMinutes = startMinutes;

  while (currentMinutes + config.slotDurationMinutes <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + config.slotDurationMinutes);

    // Só adiciona o slot se não estiver em período de pausa
    if (!isInBreakPeriod(slotStart, breakPeriods)) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
      });
    }

    currentMinutes += config.slotDurationMinutes;
  }

  return slots;
}

/**
 * Gera slots para um período específico (próximos X dias)
 * baseado nas configurações semanais
 */
export async function generateSlotsForPeriod(
  configs: Array<{
    id: string;
    dayOfWeek: number | null;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    capacityPerSlot: number;
    isActive: boolean;
    breakPeriods: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>,
  daysAhead: number
) {
  const allSlots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Zerar horas para comparação

  // Para cada dia no período
  for (let i = 0; i < daysAhead; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    
    const dayOfWeek = currentDate.getDay(); // 0-6
    
    // Buscar config para esse dia da semana
    const config = configs.find(c => 
      c.dayOfWeek === dayOfWeek && 
      c.isActive
    );
    
    if (!config) continue; // Dia não configurado ou desabilitado, pular
    
    // Gerar slots para essa data específica
    const configData = config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const breakPeriods = Array.isArray(configData.breakPeriods) 
      ? configData.breakPeriods as Array<{ id: string; startTime: string; endTime: string }>
      : [];
    
    const slots = generateTimeSlots({
      startTime: config.startTime,
      endTime: config.endTime,
      slotDurationMinutes: config.slotDurationMinutes,
      breakPeriods,
    });
    
    // Criar TimeSlots com a data específica
    for (const slot of slots) {
      allSlots.push({
        availabilityConfigId: config.id,
        dayOfWeek,
        date: currentDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalCapacity: config.capacityPerSlot,
        availableCapacity: config.capacityPerSlot,
        isAvailable: true,
      });
    }
  }
  
  // Inserir todos de uma vez (batch insert)
  if (allSlots.length > 0) {
    await prisma.timeSlot.createMany({
      data: allSlots as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      skipDuplicates: true, // Evitar duplicatas se já existir
    });
  }
  
  console.log(`✅ ${allSlots.length} slots gerados para os próximos ${daysAhead} dias`);
  
  return allSlots.length;
}

/**
 * Cria ou atualiza TimeSlots para uma configuração específica
 * Remove slots antigos e cria novos baseados na config atual
 */
export async function syncTimeSlotsForConfig(
  configId: string,
  tx?: TransactionClient
) {
  const db = tx || prisma;

  // Buscar a configuração
  const config = await db.availabilityConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error(`AvailabilityConfig ${configId} não encontrada`);
  }

  // Se não está ativo, remover todos os slots e retornar
  if (!config.isActive) {
    await db.timeSlot.deleteMany({
      where: { availabilityConfigId: configId },
    });
    return [];
  }

  // Gerar os slots baseados na configuração
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configData = config as any;
  const breakPeriods = Array.isArray(configData.breakPeriods) 
    ? configData.breakPeriods as Array<{ id: string; startTime: string; endTime: string }>
    : [];
    
  const slots = generateTimeSlots({
    startTime: config.startTime,
    endTime: config.endTime,
    slotDurationMinutes: config.slotDurationMinutes,
    breakPeriods,
  });

  // Remover slots antigos
  await db.timeSlot.deleteMany({
    where: { availabilityConfigId: configId },
  });

  // Criar novos slots
  const createdSlots = await Promise.all(
    slots.map((slot) =>
      db.timeSlot.create({
        data: {
          availabilityConfigId: configId,
          dayOfWeek: config.dayOfWeek ?? undefined,
          date: config.date || null,
          startTime: slot.startTime,
          endTime: slot.endTime,
          totalCapacity: config.capacityPerSlot,
          availableCapacity: config.capacityPerSlot,
          isAvailable: true,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })
    )
  );

  return createdSlots;
}

/**
 * Sincroniza todos os TimeSlots para todas as configurações ativas
 * Útil para regenerar tudo do zero
 */
export async function syncAllTimeSlots() {
  return await prisma.$transaction(async (tx) => {
    // Buscar todas as configs ativas
    const configs = await tx.availabilityConfig.findMany({
      where: { isActive: true },
    });

    // Remover todos os slots antigos
    await tx.timeSlot.deleteMany({});

    // Gerar slots para cada config
    const results = await Promise.all(
      configs.map((config) => syncTimeSlotsForConfig(config.id, tx))
    );

    const totalSlots = results.flat().length;
    console.log(`✅ ${totalSlots} TimeSlots sincronizados para ${configs.length} configurações`);

    return results.flat();
  });
}

/**
 * Busca slots disponíveis para uma data específica ou dia da semana
 */
export async function getAvailableSlots(params: {
  date?: Date;
  dayOfWeek?: number;
  includeBooked?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    isAvailable: true,
  };

  if (params.date) {
    where.date = params.date;
  } else if (params.dayOfWeek !== undefined) {
    where.dayOfWeek = params.dayOfWeek;
    where.date = null; // Slots regulares não têm data específica
  }

  if (!params.includeBooked) {
    where.availableCapacity = { gt: 0 };
  }

  return await prisma.timeSlot.findMany({
    where,
    orderBy: { startTime: "asc" },
    include: {
      availabilityConfig: true,
      bookings: true,
    },
  });
}
