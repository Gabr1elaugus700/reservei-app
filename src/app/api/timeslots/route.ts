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

    // Criar data sem timezone: extrair ano, mês, dia e criar Date local
    const [year, month, day] = dateParam.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);

    // Buscar todos os slots para a data específica
    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        date: requestedDate,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: timeSlots.map(slot => {
        // Formatar data sem conversão de timezone
        if (!slot.date) {
          return slot;
        }
        
        const year = slot.date.getFullYear();
        const month = String(slot.date.getMonth() + 1).padStart(2, '0');
        const day = String(slot.date.getDate()).padStart(2, '0');
        
        return {
          ...slot,
          date: `${year}-${month}-${day}`
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
