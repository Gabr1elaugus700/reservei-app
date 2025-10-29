import { NextRequest, NextResponse } from 'next/server';
import { capacityService } from '@/app/lib/capacity-service';
import { getCurrentUser } from '@/app/lib/auth-service';

// GET /api/capacity - Buscar configurações de capacidade
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const config = await capacityService.getCapacityConfiguration();
    
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de capacidade:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

// POST /api/capacity - Salvar configurações completas de capacidade
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
    const { weeklyCapacities, specialDates } = body;

    // Validações básicas
    if (!weeklyCapacities || !Array.isArray(weeklyCapacities)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'weeklyCapacities é obrigatório e deve ser um array' 
        },
        { status: 400 }
      );
    }

    if (!specialDates || !Array.isArray(specialDates)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'specialDates é obrigatório e deve ser um array' 
        },
        { status: 400 }
      );
    }

    // Validar estrutura de weeklyCapacities
    for (const wc of weeklyCapacities) {
      if (typeof wc.dayOfWeek !== 'number' || wc.dayOfWeek < 0 || wc.dayOfWeek > 6) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'dayOfWeek deve ser um número entre 0 e 6' 
          },
          { status: 400 }
        );
      }
      if (typeof wc.limit !== 'number' || wc.limit < 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'limit deve ser um número maior ou igual a 0' 
          },
          { status: 400 }
        );
      }
      if (typeof wc.enabled !== 'boolean') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'enabled deve ser um boolean' 
          },
          { status: 400 }
        );
      }
    }

    // Validar estrutura de specialDates
    for (const sd of specialDates) {
      if (!sd.date || typeof sd.date !== 'string') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'date é obrigatório e deve ser uma string' 
          },
          { status: 400 }
        );
      }
      if (typeof sd.limit !== 'number' || sd.limit < 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'limit deve ser um número maior ou igual a 0' 
          },
          { status: 400 }
        );
      }
      // Verificar se a data é válida
      const date = new Date(sd.date);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Data inválida: ${sd.date}` 
          },
          { status: 400 }
        );
      }
    }

    await capacityService.saveCapacityConfiguration({
      weeklyCapacities,
      specialDates
    });

    return NextResponse.json({
      success: true,
      message: 'Configurações de capacidade salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de capacidade:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}
