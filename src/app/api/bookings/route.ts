import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";

interface BookingQueryResult {
  id: string;
  customer_name: string;
  customer_phone: string;
  date: Date;
  time: string;
  adults: number;
  children: number;
  totalPrice: number | null;
  status: string;
  notes: string | null;
}

// GET /api/bookings/[date]
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Buscar bookings usando comparação de data sem timezone
    const bookings = await prisma.$queryRaw<Array<BookingQueryResult>>`
      SELECT 
        b.*,
        c.name as customer_name,
        c.phone as customer_phone
      FROM "Booking" b
      INNER JOIN "Customer" c ON b."customerId" = c.id
      WHERE b.date::date = ${dateParam}::date
      ORDER BY b.time ASC
    `;

    return NextResponse.json({
      success: true,
      data: bookings.map((booking) => ({
        id: booking.id,
        name: booking.customer_name,
        phone: booking.customer_phone,
        date: booking.date,
        time: booking.time,
        adults: booking.adults,
        children: booking.children,
        totalPrice: booking.totalPrice ? Number(booking.totalPrice) : 0,
        status: booking.status,
        notes: booking.notes,
      })),
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

  // POST /api/bookings
  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const { timeSlotId, customerId, date, time, adults, children, totalPrice, notes } = body;

      // Validação básica
      if (!timeSlotId || !customerId || !date || !time) {
        return NextResponse.json(
          { success: false, message: "Missing required fields: timeSlotId, customerId, date, time" },
          { status: 400 }
        );
      }

    if (!adults || adults < 1) {
      return NextResponse.json(
        { success: false, message: "At least 1 adult is required" },
        { status: 400 }
      );
    }

    // Apenas adultos contam para capacidade (crianças são apenas pagantes)
    const capacityNeeded = adults;

    // Usar transação para garantir atomicidade
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar se o slot existe e tem capacidade
      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: timeSlotId },
      });

      if (!timeSlot) {
        throw new Error("Time slot not found");
      }

      if (timeSlot.availableCapacity < capacityNeeded) {
        throw new Error(`Time slot does not have enough capacity. Available: ${timeSlot.availableCapacity}, Required: ${capacityNeeded}`);
      }        // 2. Criar o booking
        const booking = await tx.booking.create({
          data: {
            customerId,
            date: new Date(date + 'T00:00:00.000Z'),
            time,
            adults: adults || 0,
            children: children || 0,
            totalPrice,
            notes,
            timeSlotId,
            status: "PENDING",
          },
          include: {
            customer: true,
          },
        });

      // 3. Decrementar a capacidade disponível apenas por adultos
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          availableCapacity: {
            decrement: capacityNeeded,
          },
        },
      });

      return booking;
    });

      return NextResponse.json({
        success: true,
        message: "Booking created successfully",
        data: {
          id: result.id,
          customer: result.customer.name,
          date: result.date,
          time: result.time,
          status: result.status,
        },
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating booking:", error);
    
    if (error instanceof Error) {
      if (error.message === "Time slot not found") {
        return NextResponse.json(
          { success: false, message: "Time slot not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("does not have enough capacity")) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 409 }
        );
      }
    }      return NextResponse.json(
        { success: false, message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }
