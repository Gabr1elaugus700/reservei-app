import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { availabilityConfigSchema } from "@/lib/validations/availability-config.schema";
import { syncTimeSlotsForConfig } from "@/lib/timeslot-service";
import { serializeConfigDates, serializeConfigDate, parseDate } from "@/lib/date-serializer";

// GET /api/availability-configs - Get all availability configs
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const configs = await prisma.availabilityConfig.findMany();

    if (!configs) {
      return NextResponse.json(
        { success: false, message: "No availability configs found" },
        { status: 404 }
      );
    }

    // Serializar datas corretamente - sempre YYYY-MM-DD sem timezone
    const serializedConfigs = serializeConfigDates(configs);

    return new Response(JSON.stringify(serializedConfigs), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error fetching availability configs:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/availability-configs - Create new availability config
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
    
    // Validar payload
    const validation = availabilityConfigSchema.safeParse(body);
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

    const parsedData = validation.data;

    console.log(`[POST /api/availability-configs] Data recebida:`, parsedData);

    // Verificar se já existe configuração para essa data ou dayOfWeek
    const existingConfig = await prisma.availabilityConfig.findFirst({
      where: parsedData.dayOfWeek !== undefined
        ? { dayOfWeek: parsedData.dayOfWeek, date: null }
        : { date: parsedData.date ? parseDate(parsedData.date) : undefined },
    });

    console.log(`[POST /api/availability-configs] Config existente encontrada:`, existingConfig ? `ID=${existingConfig.id}` : 'NENHUMA');

    let config;

    if (existingConfig) {
      // Atualizar configuração existente
      console.log(`[POST /api/availability-configs] → Atualizando config ID=${existingConfig.id}`);
      config = await prisma.availabilityConfig.update({
        where: { id: existingConfig.id },
        data: {
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          slotDurationMinutes: parsedData.slotDurationMinutes,
          capacityPerSlot: parsedData.capacityPerSlot,
          isActive: parsedData.isActive,
          isException: parsedData.isException,
          breakPeriods: parsedData.breakPeriods || [],
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } else {
      // Criar configuração nova
      console.log(`[POST /api/availability-configs] → Criando nova config`);
      config = await prisma.availabilityConfig.create({
        data: {
          dayOfWeek: parsedData.dayOfWeek,
          date: parsedData.date ? parseDate(parsedData.date) : null,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          slotDurationMinutes: parsedData.slotDurationMinutes,
          capacityPerSlot: parsedData.capacityPerSlot,
          isException: parsedData.isException,
          isActive: parsedData.isActive,
          breakPeriods: parsedData.breakPeriods || [],
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    }

    console.log(`[POST /api/availability-configs] ✓ Config salva com ID=${config.id}`);

    // Gerar TimeSlots automaticamente
    await syncTimeSlotsForConfig(config.id);

    // Serializar data como YYYY-MM-DD (sem timezone)
    const serializedConfig = serializeConfigDate(config);

    return NextResponse.json({
      success: true,
      data: serializedConfig,
      updated: !!existingConfig, // Indica se foi atualização ao invés de criação
    }, { status: existingConfig ? 200 : 201 });
  } catch (error) {
    console.error("Error creating availability config:", error);
    
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
