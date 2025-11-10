// This file will handle schedule configurations creation
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { z } from "zod";

const ScheduleConfigInput = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(), // "09:00"
  endTime: z.string(), // "18:00"
  slots: z.array(
    z.object({
      time: z.string(), // "09:00"
      available: z.boolean(), // true=livre, false=bloqueado
      reason: z.string().optional(), // Motivo do bloqueio (ex: "Almoço")
    })
  ),
});

// POST /api/schedule - Create schedule configuration
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await request.json();

    const parsedBody = ScheduleConfigInput.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input", errors: parsedBody.error },
        { status: 400 }
      );
    }



  } catch (error) {
    console.error("Error creating schedule configuration:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
