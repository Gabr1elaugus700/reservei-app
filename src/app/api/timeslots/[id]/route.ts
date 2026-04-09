import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/timeslots/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { totalCapacity } = body;

    // Validação de entrada
    if (typeof totalCapacity !== "number" || totalCapacity < 1) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Capacidade deve ser um número maior que zero" 
        },
        { status: 400 }
      );
    }

    // Buscar o slot atual
    const currentSlot = await prisma.timeSlot.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED", "COMPLETED"]
            }
          }
        }
      }
    });

    if (!currentSlot) {
      return NextResponse.json(
        { success: false, message: "Slot não encontrado" },
        { status: 404 }
      );
    }

    // RF01: Validar que a nova capacidade é >= número de ADULTOS reservados
    const totalAdultsBooked = currentSlot.bookings.reduce((sum, booking) => sum + booking.adults, 0);
    
    if (totalCapacity < totalAdultsBooked) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Não é possível diminuir a capacidade para ${totalCapacity}. Há ${totalAdultsBooked} adultos já reservados neste horário.` 
        },
        { status: 400 }
      );
    }

    // Calcular nova capacidade disponível
    // availableCapacity = totalCapacity - total de adultos reservados
    const newAvailableCapacity = totalCapacity - totalAdultsBooked;

    // Atualizar o slot
    const updatedSlot = await prisma.timeSlot.update({
      where: { id },
      data: {
        totalCapacity,
        availableCapacity: newAvailableCapacity,
        isAvailable: newAvailableCapacity > 0
      }
    });

    // Formatar resposta
    const formattedSlot = updatedSlot.date ? {
      ...updatedSlot,
      date: `${updatedSlot.date.getFullYear()}-${String(updatedSlot.date.getMonth() + 1).padStart(2, '0')}-${String(updatedSlot.date.getDate()).padStart(2, '0')}`
    } : updatedSlot;

    return NextResponse.json({
      success: true,
      message: "Capacidade atualizada com sucesso",
      data: formattedSlot
    });

  } catch (error) {
    console.error("Error updating timeslot capacity:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Erro ao atualizar capacidade do horário" 
      },
      { status: 500 }
    );
  }
}
