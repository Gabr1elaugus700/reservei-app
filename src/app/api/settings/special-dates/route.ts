import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { z } from "zod";

const specialDateFieldsSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  isOpen: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  slotInterval: z.number().min(1).optional(),
  maxCapacity: z.number().min(1).optional(),
  reason: z.string().max(500).optional(),
});

// POST /api/settings/special-dates - Create new special date
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const data = await request.json();
    const validated = specialDateFieldsSchema.parse(data);

    if (!validated.date || validated.isOpen === undefined) {
      return NextResponse.json(
        { success: false, message: "Date and isOpen fields are required" },
        { status: 400 }
      );
    }

    const specialDateSchedule = await prisma.specialDateSchedule.create({
      data: {
        date: validated.date,
        isOpen: validated.isOpen,
        startTime: validated.startTime,
        endTime: validated.endTime,
        slotInterval: validated.slotInterval,
        maxCapacity: validated.maxCapacity,
        reason: validated.reason,
      },
    });

    return NextResponse.json(
      { success: true, data: specialDateSchedule },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating special date schedule:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
