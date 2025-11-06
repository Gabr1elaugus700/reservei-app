import { NextRequest, NextResponse } from 'next/server';
import { capacityService } from '@/lib/capacity-service';
import { getCurrentUser } from '@/lib/auth-service';

// GET /api/capacity/check/[date] - Verificar capacidade para uma data específica
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string }}
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { date } = await params;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Data inválida: ${date}` 
        },
        { status: 400 }
      );
    }

    const capacity = await capacityService.getCapacityForDate(date);

    return NextResponse.json({
      success: true,
      data: {
        date,
        capacity,
        dayOfWeek: dateObj.getDay(),
        dayName: dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }),
        isAvailable: capacity !== null && capacity > 0
      }
    });
  } catch (error) {
    console.error('Erro ao verificar capacidade:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}
