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

    // Validar formato de data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Buscar todos os slots para a data específica
    // Usar raw SQL para comparar apenas a parte da data, ignorando timezone
    const timeSlots = await prisma.$queryRaw`
      SELECT * FROM "TimeSlot"
      WHERE date::date = ${dateParam}::date
      ORDER BY "startTime" ASC
    `;

    return NextResponse.json({
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
