import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { bulkAvailabilityConfigSchema } from "@/lib/validations/availability-config.schema";
import { generateSlotsForPeriod } from "@/lib/timeslot-service";

/**
 * POST /api/availability-configs/bulk
 * Salva múltiplas configurações de disponibilidade de uma vez
 * Gera automaticamente os TimeSlots para cada configuração
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Extrair configs e daysAhead do payload
    const { configs, daysAhead = 30 } = body;
    
    // Validar payload
    const validation = bulkAvailabilityConfigSchema.safeParse({ configs });
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Dados inválidos",
          errors: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { configs: validatedConfigs } = validation.data;

    // Salvar todas as configurações em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const savedConfigs = [];

      for (const configData of validatedConfigs) {
        // Verificar se já existe config para esse dayOfWeek ou date
        const existingConfig = await tx.availabilityConfig.findFirst({
          where: configData.dayOfWeek !== undefined
            ? { dayOfWeek: configData.dayOfWeek, date: null }
            : { date: configData.date ? new Date(configData.date + 'T00:00:00.000Z') : undefined },
        });

        let savedConfig;

        if (existingConfig) {
          // Atualizar config existente
          savedConfig = await tx.availabilityConfig.update({
            where: { id: existingConfig.id },
            data: {
              startTime: configData.startTime,
              endTime: configData.endTime,
              slotDurationMinutes: configData.slotDurationMinutes,
              capacityPerSlot: configData.capacityPerSlot,
              isActive: configData.isActive,
              isException: configData.isException,
              breakPeriods: configData.breakPeriods || [],
            } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          });
        } else {
          // Criar nova config
          savedConfig = await tx.availabilityConfig.create({
            data: {
              dayOfWeek: configData.dayOfWeek,
              date: configData.date ? new Date(configData.date + 'T00:00:00.000Z') : null,
              startTime: configData.startTime,
              endTime: configData.endTime,
              slotDurationMinutes: configData.slotDurationMinutes,
              capacityPerSlot: configData.capacityPerSlot,
              isActive: configData.isActive,
              isException: configData.isException,
              breakPeriods: configData.breakPeriods || [],
            } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          });
        }

        savedConfigs.push(savedConfig);
      }

      return savedConfigs;
    });

    // Gerar TimeSlots para o período especificado
    const totalSlots = await generateSlotsForPeriod(result as any, daysAhead); // eslint-disable-line @typescript-eslint/no-explicit-any

    console.log(`✅ ${result.length} configurações salvas`);
    console.log(`✅ ${totalSlots} TimeSlots gerados para ${daysAhead} dias`);

    return NextResponse.json(
      {
        success: true,
        message: `${result.length} configuração(ões) salva(s) com sucesso`,
        data: {
          configs: result,
          totalSlots,
          daysAhead,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving bulk availability configs:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
