import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeStoredCustomerPhone } from "@/lib/customers";
import { isCounterCustomerId } from "@/lib/counter-customer";
import { normalizePhone } from "@/lib/phone";
import { calculateTotalPrice } from "@/lib/booking-display";
import { planCapacityAdjustment, type CapacityPlan } from "@/lib/booking-check";
import {
  formatStoredDate,
  isIsoDate,
  isTimeValue,
  todayIsoInTimeZone,
  toUtcDateOnly,
} from "@/lib/booking-dates";

const ACTIVE_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

class PublicBookingError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicBookingError";
    this.status = status;
  }
}

type UpdateBody = {
  phone: string;
  timeSlotId: string;
  date: string;
  time: string;
  adults: number;
  children: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readBody(value: unknown): UpdateBody | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.phone !== "string" ||
    typeof value.timeSlotId !== "string" ||
    typeof value.date !== "string" ||
    typeof value.time !== "string" ||
    typeof value.adults !== "number" ||
    typeof value.children !== "number"
  ) {
    return null;
  }

  return {
    phone: value.phone,
    timeSlotId: value.timeSlotId,
    date: value.date,
    time: value.time,
    adults: value.adults,
    children: value.children,
  };
}

function readPrice(
  totalPrice: Prisma.Decimal | null,
  adults: number,
  children: number
): number {
  if (totalPrice == null) return calculateTotalPrice(adults, children);
  return Number(totalPrice);
}

async function applyCapacity(
  tx: Prisma.TransactionClient,
  plan: CapacityPlan
): Promise<void> {
  if (plan.type === "same-slot") {
    if (plan.delta > 0) {
      const taken = await tx.timeSlot.updateMany({
        where: {
          id: plan.slotId,
          availableCapacity: { gte: plan.delta },
        },
        data: { availableCapacity: { decrement: plan.delta } },
      });
      if (taken.count !== 1) {
        const slot = await tx.timeSlot.findUnique({
          where: { id: plan.slotId },
          select: { availableCapacity: true },
        });
        throw new PublicBookingError(
          `Não há vagas suficientes neste horário. Disponíveis: ${slot?.availableCapacity ?? 0}, necessárias: ${plan.delta}`,
          409
        );
      }
    } else if (plan.delta < 0) {
      await tx.timeSlot.update({
        where: { id: plan.slotId },
        data: { availableCapacity: { increment: -plan.delta } },
      });
    }
    return;
  }

  const taken = await tx.timeSlot.updateMany({
    where: {
      id: plan.toSlotId,
      availableCapacity: { gte: plan.take },
    },
    data: { availableCapacity: { decrement: plan.take } },
  });

  if (taken.count !== 1) {
    const slot = await tx.timeSlot.findUnique({
      where: { id: plan.toSlotId },
      select: { availableCapacity: true },
    });
    throw new PublicBookingError(
      `Não há vagas suficientes neste horário. Disponíveis: ${slot?.availableCapacity ?? 0}, necessárias: ${plan.take}`,
      409
    );
  }

  await tx.timeSlot.update({
    where: { id: plan.fromSlotId },
    data: { availableCapacity: { increment: plan.release } },
  });
}

// PATCH /api/bookings/public/[id]
// Autorizado só pelo WhatsApp nesta versão: sem nome e sem código.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = readBody(await request.json());

    if (!body || !id) {
      return NextResponse.json(
        { success: false, message: "Dados do agendamento inválidos" },
        { status: 400 }
      );
    }

    const phone = normalizePhone(body.phone);
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Número de WhatsApp inválido" },
        { status: 400 }
      );
    }

    if (!isIsoDate(body.date) || !isTimeValue(body.time) || !body.timeSlotId) {
      return NextResponse.json(
        { success: false, message: "Data ou horário inválido" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(body.adults) ||
      body.adults < 1 ||
      !Number.isInteger(body.children) ||
      body.children < 0
    ) {
      return NextResponse.json(
        { success: false, message: "Informe ao menos 1 adulto" },
        { status: 400 }
      );
    }

    const today = todayIsoInTimeZone();
    if (body.date < today) {
      return NextResponse.json(
        { success: false, message: "Escolha uma data de hoje em diante" },
        { status: 400 }
      );
    }

    const totalPrice = calculateTotalPrice(body.adults, body.children);

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, phone: true } },
        },
      });

      if (
        !current ||
        isCounterCustomerId(current.customer.id) ||
        normalizePhone(current.customer.phone) !== phone
      ) {
        throw new PublicBookingError("Agendamento não encontrado", 404);
      }

      const isActive =
        current.status === BookingStatus.PENDING ||
        current.status === BookingStatus.CONFIRMED;

      if (!isActive || formatStoredDate(current.date) < today) {
        throw new PublicBookingError(
          "Este agendamento não pode mais ser alterado.",
          409
        );
      }

      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: body.timeSlotId },
      });

      if (!timeSlot) {
        throw new PublicBookingError("Horário não encontrado", 404);
      }

      if (timeSlot.startTime !== body.time) {
        throw new PublicBookingError("Horário inválido", 400);
      }

      if (timeSlot.date && formatStoredDate(timeSlot.date) !== body.date) {
        throw new PublicBookingError(
          "O horário não pertence à data selecionada",
          400
        );
      }

      const previous = {
        date: formatStoredDate(current.date),
        time: current.time,
        adults: current.adults,
        children: current.children,
        totalPrice: readPrice(current.totalPrice, current.adults, current.children),
      };

      await applyCapacity(
        tx,
        planCapacityAdjustment({
          currentSlotId: current.timeSlotId,
          nextSlotId: timeSlot.id,
          currentAdults: current.adults,
          nextAdults: body.adults,
        })
      );

      const written = await tx.booking.updateMany({
        where: {
          id,
          status: { in: ACTIVE_STATUSES },
        },
        data: {
          date: toUtcDateOnly(body.date),
          time: timeSlot.startTime,
          timeSlotId: timeSlot.id,
          adults: body.adults,
          children: body.children,
          totalPrice,
        },
      });

      if (written.count !== 1) {
        throw new PublicBookingError(
          "Este agendamento não pode mais ser alterado.",
          409
        );
      }

      await normalizeStoredCustomerPhone(tx, current.customer.id);

      return { previous };
    });

    return NextResponse.json({
      success: true,
      message: "Agendamento atualizado",
      data: {
        id,
        date: body.date,
        time: body.time,
        adults: body.adults,
        children: body.children,
        totalPrice,
        previous: updated.previous,
      },
    });
  } catch (error) {
    if (error instanceof PublicBookingError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("Error updating public booking:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao atualizar agendamento" },
      { status: 500 }
    );
  }
}
