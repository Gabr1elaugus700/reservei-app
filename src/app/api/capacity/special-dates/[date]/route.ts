import { NextRequest, NextResponse } from 'next/server';
import { capacityService } from '@/lib/capacity-service';
import { getCurrentUser } from '@/lib/auth-service';

// PUT /api/capacity/special-dates/[date] - Atualizar uma data especial
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
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
    const body = await request.json();
    const { limit, description } = body;

    // Validações
    if (typeof limit !== 'number' || limit < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'limite deve ser um número maior ou igual a 0' 
        },
        { status: 400 }
      );
    }

    // Verificar se a data é válida
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

    await capacityService.updateSpecialDate(date, {
      limit,
      description
    });

    return NextResponse.json({
      success: true,
      message: 'Data especial atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar data especial:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/capacity/special-dates/[date] - Remover uma data especial
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
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

    // Verificar se a data é válida
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

    await capacityService.removeSpecialDate(date);

    return NextResponse.json({
      success: true,
      message: 'Data especial removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover data especial:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}