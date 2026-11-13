import { NextRequest, NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findCustomersByPhone } from "@/lib/customers";
import { isCounterCustomerId } from "@/lib/counter-customer";
import { normalizePhone } from "@/lib/phone";
import { calculateTotalPrice } from "@/lib/booking-display";
import { selectActiveBooking } from "@/lib/booking-check";
import {
  formatStoredDate,
  isIsoDate,
  todayIsoInTimeZone,
  toUtcDateOnly,
} from "@/lib/booking-dates";

const ACTIVE_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

// GET /api/bookings/check?phone=&date=&timeSlotId=
export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get("phone") ?? "";
    const date = request.nextUrl.searchParams.get("date") ?? "";
    const timeSlotId = request.nextUrl.searchParams.get("timeSlotId") ?? "";
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: "Número de WhatsApp inválido" },
        { status: 400 }
      );
    }

    if (!isIsoDate(date) || !timeSlotId) {
      return NextResponse.json(
        { success: false, message: "Data ou horário inválido" },
        { status: 400 }
      );
    }

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: { id: true, startTime: true },
    });

    if (!timeSlot) {
      return NextResponse.json(
        { success: false, message: "Horário não encontrado" },
        { status: 404 }
      );
    }

    const customers = (await findCustomersByPhone(normalizedPhone)).filter(
      (customer) => !isCounterCustomerId(customer.id)
    );
    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        sameSlot: false,
        booking: null,
      });
    }

    const today = todayIsoInTimeZone();
    const bookings = await prisma.booking.findMany({
      where: {
        customerId: { in: customers.map((customer) => customer.id) },
        status: { in: ACTIVE_STATUSES },
        date: { gte: toUtcDateOnly(today) },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        date: true,
        time: true,
        adults: true,
        children: true,
        totalPrice: true,
        timeSlotId: true,
        createdAt: true,
      },
    });

    const selectable = bookings
      .map((booking) => ({
        id: booking.id,
        date: formatStoredDate(booking.date),
        time: booking.time,
        adults: booking.adults,
        children: booking.children,
        totalPrice:
          booking.totalPrice == null
            ? calculateTotalPrice(booking.adults, booking.children)
            : Number(booking.totalPrice),
        timeSlotId: booking.timeSlotId,
        createdAt: booking.createdAt.toISOString(),
      }))
      .filter((booking) => booking.date >= today);

    const result = selectActiveBooking(selectable, {
      date,
      time: timeSlot.startTime,
      timeSlotId: timeSlot.id,
    });

    return NextResponse.json({
      success: true,
      sameSlot: result.sameSlot,
      booking: result.booking,
    });
  } catch (error) {
    console.error("Error checking duplicate booking:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao verificar agendamentos" },
      { status: 500 }
    );
  }
}
