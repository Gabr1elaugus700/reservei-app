import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { normalizeStoredCustomerPhone } from "@/lib/customers";
import {
  counterCustomerStore,
  isCounterCustomerId,
  normalizeCounterNotes,
  resolveBookingCustomer,
} from "@/lib/counter-customer";

// GET /api/bookings?date=YYYY-MM-DD
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

    // Criar data sem timezone: extrair ano, mês, dia e criar Date local
    const [year, month, day] = dateParam.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month é 0-indexed

    // Buscar bookings
    const bookings = await prisma.booking.findMany({
      where: {
        date,
      },
      include: {
        customer: true,
      },
      orderBy: {
        time: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: bookings.map((booking) => {
        // Formatar data sem conversão de timezone
        const bookingYear = booking.date.getFullYear();
        const bookingMonth = String(booking.date.getMonth() + 1).padStart(2, "0");
        const bookingDay = String(booking.date.getDate()).padStart(2, "0");
        const counter = isCounterCustomerId(booking.customer.id);

        return {
          id: booking.id,
          name: booking.customer.name,
          phone: counter ? "" : (booking.customer.phone ?? ""),
          date: `${bookingYear}-${bookingMonth}-${bookingDay}`,
          time: booking.time,
          adults: booking.adults,
          children: booking.children,
          totalPrice: booking.totalPrice ? Number(booking.totalPrice) : 0,
          status: booking.status,
          notes: booking.notes,
          timeSlotId: booking.timeSlotId,
          isCounter: counter,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalNotes(value: unknown): string | null | undefined {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
}

// POST /api/bookings
export async function POST(request: NextRequest) {
  try {
    const payload: unknown = await request.json();
    const body = isRecord(payload) ? payload : {};
    const counter = body.counter === true;
    const timeSlotId = typeof body.timeSlotId === "string" ? body.timeSlotId : "";
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    const adults = typeof body.adults === "number" ? body.adults : Number.NaN;
    const children = typeof body.children === "number" ? body.children : 0;
    const totalPrice = typeof body.totalPrice === "number" ? body.totalPrice : undefined;

    if (!timeSlotId || !date || !time || (!counter && !body.customerId)) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: timeSlotId, customerId, date, time" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(adults) || adults < 1) {
      return NextResponse.json(
        { success: false, message: "At least 1 adult is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const resolved = await resolveBookingCustomer(
      {
        counter,
        hasSession: user !== null,
        customerId: body.customerId,
      },
      counterCustomerStore(prisma)
    );

    if (!resolved.ok) {
      return NextResponse.json(
        { success: false, message: resolved.message },
        { status: resolved.status }
      );
    }

    let notes = readOptionalNotes(body.notes);
    if (resolved.counter) {
      const parsedNotes = normalizeCounterNotes(body.notes);
      if (!parsedNotes.ok) {
        return NextResponse.json(
          { success: false, message: parsedNotes.message },
          { status: 400 }
        );
      }
      notes = parsedNotes.notes;
    }

    // Apenas adultos contam para capacidade (crianças são apenas pagantes).
    // Balcão usa a mesma regra e a mesma transação dos outros agendamentos.
    const capacityNeeded = adults;
    const customerId = resolved.customerId;

    const result = await prisma.$transaction(async (tx) => {
      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: timeSlotId },
      });

      if (!timeSlot) {
        throw new Error("Time slot not found");
      }

      if (timeSlot.availableCapacity < capacityNeeded) {
        throw new Error(`Time slot does not have enough capacity. Available: ${timeSlot.availableCapacity}, Required: ${capacityNeeded}`);
      }

      if (!resolved.counter) {
        await normalizeStoredCustomerPhone(tx, customerId);
      }

      const [year, month, day] = date.split("-").map(Number);
      const bookingDate = new Date(year, month - 1, day);

      const booking = await tx.booking.create({
        data: {
          customerId,
          date: bookingDate,
          time,
          adults,
          children,
          totalPrice,
          notes,
          timeSlotId,
          status: "PENDING",
        },
        include: {
          customer: true,
        },
      });

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
        date: `${result.date.getFullYear()}-${String(result.date.getMonth() + 1).padStart(2, "0")}-${String(result.date.getDate()).padStart(2, "0")}`,
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
    }

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
