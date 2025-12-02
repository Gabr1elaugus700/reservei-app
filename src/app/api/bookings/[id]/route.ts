import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";

// PATCH /api/bookings/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { adults, children, status } = body;

    // Buscar o booking atual
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      include: { timeSlot: true },
    });

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Se está alterando adults/children, precisamos ajustar a capacidade do slot
    if (adults !== undefined || children !== undefined) {
      const newAdults = adults ?? currentBooking.adults;
      const newChildren = children ?? currentBooking.children;
      // Apenas adultos afetam a capacidade (crianças são apenas pagantes)
      const oldCapacity = currentBooking.adults;
      const newCapacity = newAdults;
      const difference = newCapacity - oldCapacity;

      // Usar transação para garantir atomicidade
      const result = await prisma.$transaction(async (tx) => {
        // Verificar se há capacidade suficiente
        if (difference > 0 && currentBooking.timeSlot.availableCapacity < difference) {
          throw new Error(
            `Not enough capacity. Available: ${currentBooking.timeSlot.availableCapacity}, Required: ${difference}`
          );
        }

        // Atualizar o booking
        const updatedBooking = await tx.booking.update({
          where: { id },
          data: {
            adults: newAdults,
            children: newChildren,
            status: status ?? currentBooking.status,
          },
          include: {
            customer: true,
          },
        });

        // Ajustar a capacidade do slot
        if (difference !== 0) {
          await tx.timeSlot.update({
            where: { id: currentBooking.timeSlotId },
            data: {
              availableCapacity: {
                increment: -difference, // decrementa se difference > 0, incrementa se < 0
              },
            },
          });
        }

        return updatedBooking;
      });

      return NextResponse.json({
        success: true,
        message: "Booking updated successfully",
        data: {
          id: result.id,
          name: result.customer.name,
          phone: result.customer.phone,
          adults: result.adults,
          children: result.children,
          status: result.status,
          date: result.date,
          time: result.time,
        },
      });
    } else if (status !== undefined) {
      // Apenas atualizar o status
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { status },
        include: { customer: true },
      });

      return NextResponse.json({
        success: true,
        message: "Booking status updated successfully",
        data: {
          id: updatedBooking.id,
          name: updatedBooking.customer.name,
          phone: updatedBooking.customer.phone,
          adults: updatedBooking.adults,
          children: updatedBooking.children,
          status: updatedBooking.status,
          date: updatedBooking.date,
          time: updatedBooking.time,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "No valid fields to update" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating booking:", error);

    if (error instanceof Error) {
      if (error.message.includes("Not enough capacity")) {
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
