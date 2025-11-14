import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/timeslots?date=2025-11-20
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { success: false, message: "Date parameter is required" },
        { status: 400 }
      );
    }

    const requestedDate = new Date(dateParam);
    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Buscar slots para a data específica
      const allTimeSlots = await prisma.timeSlot.findMany({
      where: {
        date: requestedDate,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Filtrar apenas slots disponíveis
    const timeSlots = allTimeSlots.filter((slot) => slot.availableCapacity > 0);    return NextResponse.json({
      success: true,
      data: timeSlots,
    });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
