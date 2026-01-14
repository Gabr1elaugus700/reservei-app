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
    
    // Criar TimeSlots com a data específica (sem timezone)
    for (const slot of slots) {
      allSlots.push({
        availabilityConfigId: config.id,
        dayOfWeek,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
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
 * Mantém slots com agendamentos existentes e atualiza apenas slots vazios
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

  // Se não está ativo, desativar todos os slots sem agendamentos
  if (!config.isActive) {
    // Buscar slots com agendamentos
    const slotsWithBookings = await db.timeSlot.findMany({
      where: { 
        availabilityConfigId: configId,
        bookings: {
          some: {}
        }
      },
      select: { id: true }
    });

    const slotIdsWithBookings = slotsWithBookings.map(s => s.id);

    // Deletar apenas slots SEM agendamentos
    await db.timeSlot.deleteMany({
      where: { 
        availabilityConfigId: configId,
        id: { notIn: slotIdsWithBookings }
      },
    });

    // Desativar slots COM agendamentos
    if (slotIdsWithBookings.length > 0) {
      await db.timeSlot.updateMany({
        where: { id: { in: slotIdsWithBookings } },
        data: { isAvailable: false }
      });
    }

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

  // Buscar todos os slots existentes para esta config
  const existingSlots = await db.timeSlot.findMany({
    where: { availabilityConfigId: configId },
    include: {
      bookings: true
    }
  });

  // Separar slots com e sem agendamentos
  const slotsWithBookings = existingSlots.filter(s => s.bookings.length > 0);
  const slotsWithoutBookings = existingSlots.filter(s => s.bookings.length === 0);

  // IDs dos slots com agendamentos (para preservar)
  const slotIdsWithBookings = slotsWithBookings.map(s => s.id);

  // Horários dos slots que devem existir (gerados pela configuração)
  const targetSlotTimes = slots.map(s => s.startTime);

  // Remover apenas slots VAZIOS que não estão mais na configuração
  const slotIdsToDelete = slotsWithoutBookings
    .filter(s => !targetSlotTimes.includes(s.startTime))
    .map(s => s.id);

  if (slotIdsToDelete.length > 0) {
    await db.timeSlot.deleteMany({
      where: { id: { in: slotIdsToDelete } }
    });
  }

  // Atualizar slots com agendamentos que ainda estão na configuração
  const slotsToUpdate = slotsWithBookings.filter(s => 
    targetSlotTimes.includes(s.startTime)
  );

  for (const slot of slotsToUpdate) {
    // Encontrar a configuração do slot atualizado
    const targetSlot = slots.find(s => s.startTime === slot.startTime);
    if (!targetSlot) continue;

    // Para slots COM agendamentos: só atualiza se a nova capacidade for MAIOR
    const shouldUpdateCapacity = config.capacityPerSlot > slot.totalCapacity;
    
    if (shouldUpdateCapacity) {
      const usedCapacity = slot.totalCapacity - slot.availableCapacity;
      const newAvailableCapacity = Math.max(0, config.capacityPerSlot - usedCapacity);

      await db.timeSlot.update({
        where: { id: slot.id },
        data: {
          endTime: targetSlot.endTime,
          totalCapacity: config.capacityPerSlot,
          availableCapacity: newAvailableCapacity,
          isAvailable: true,
        }
      });
    } else {
      // Se não atualizar capacidade, pelo menos atualiza endTime e reativa
      await db.timeSlot.update({
        where: { id: slot.id },
        data: {
          endTime: targetSlot.endTime,
          isAvailable: true,
        }
      });
    }
  }

  // Atualizar slots SEM agendamentos que ainda estão na configuração
  const slotsWithoutBookingsToUpdate = slotsWithoutBookings.filter(s => 
    targetSlotTimes.includes(s.startTime)
  );

  for (const slot of slotsWithoutBookingsToUpdate) {
    const targetSlot = slots.find(s => s.startTime === slot.startTime);
    if (!targetSlot) continue;

    // Para slots SEM agendamentos: SEMPRE atualiza para nova capacidade
    await db.timeSlot.update({
      where: { id: slot.id },
      data: {
        endTime: targetSlot.endTime,
        totalCapacity: config.capacityPerSlot,
        availableCapacity: config.capacityPerSlot,
        isAvailable: true,
      }
    });
  }

  // Criar novos slots para horários que não existem ainda
  const slotsToCreate = slots.filter(s => 
    !existingSlots.some(existing => existing.startTime === s.startTime)
  );

  const createdSlots = await Promise.all(
    slotsToCreate.map((slot) =>
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

  console.log(`✅ Sync completo: ${slotsToUpdate.length + slotsWithoutBookingsToUpdate.length} atualizados, ${createdSlots.length} criados, ${slotIdsToDelete.length} removidos (${slotIdsWithBookings.length} preservados com bookings)`);

  return [...slotsToUpdate, ...slotsWithoutBookingsToUpdate, ...createdSlots];
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
