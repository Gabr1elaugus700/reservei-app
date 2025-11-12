import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { z } from "zod";

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

// Schema for validating availability config data
const availabilityConfigSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 (Sunday) to 6 (Saturday)
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  slotDurationMinutes: z.number().min(1).default(30),
  capacityPerSlot: z.number().min(1).default(1),
  isException: z.boolean().default(false),
  isActive: z.boolean().default(true),
  date: z.string().optional(),
});

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
    const parsedData = availabilityConfigSchema.parse(body);

    const newConfig = await prisma.availabilityConfig.create({
      data: parsedData,
    });

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error("Error creating availability config:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
