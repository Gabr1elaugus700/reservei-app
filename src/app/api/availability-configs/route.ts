import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { availabilityConfigSchema } from "@/lib/validations/availability-config.schema";
import { syncTimeSlotsForConfig } from "@/lib/timeslot-service";

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

    return new Response(JSON.stringify(configs), {
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

    // Criar configuração
    const newConfig = await prisma.availabilityConfig.create({
      data: {
        dayOfWeek: parsedData.dayOfWeek,
        date: parsedData.date ? (() => {
          const [y, m, d] = parsedData.date.split('-').map(Number);
          return new Date(y, m - 1, d);
        })() : null,
        startTime: parsedData.startTime,
        endTime: parsedData.endTime,
        slotDurationMinutes: parsedData.slotDurationMinutes,
        capacityPerSlot: parsedData.capacityPerSlot,
        isException: parsedData.isException,
        isActive: parsedData.isActive,
        breakPeriods: parsedData.breakPeriods || [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    // Gerar TimeSlots automaticamente
    await syncTimeSlotsForConfig(newConfig.id);

    return NextResponse.json({
      success: true,
      data: newConfig,
    }, { status: 201 });
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
