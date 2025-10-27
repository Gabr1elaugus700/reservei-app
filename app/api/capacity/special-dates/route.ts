import { NextRequest, NextResponse } from 'next/server';
import { capacityService } from '@/app/lib/capacity-service';
import { getCurrentUser } from '@/app/lib/auth-service';

// POST /api/capacity/special-dates - Adicionar uma nova data especial
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { date, limit, description } = body;

    // Validações
    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'data é obrigatória e deve ser uma string no formato YYYY-MM-DD' 
        },
        { status: 400 }
      );
    }

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

    await capacityService.addSpecialDate(user.tenantId, {
      date,
      limit,
      description
    });

    return NextResponse.json({
      success: true,
      message: 'Data especial adicionada com sucesso'
    });
  } catch (error: unknown) {
    console.error('Erro ao adicionar data especial:', error);
    
    // Verificar se é erro de duplicata
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Já existe uma configuração para esta data' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}