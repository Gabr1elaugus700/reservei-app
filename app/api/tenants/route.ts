import { NextRequest, NextResponse } from 'next/server';
import { getAllTenants, createTenant } from '../../lib/tenant-service';
import { TenantTheme } from '../../lib/theme-manager';

export async function GET() {
  try {
    const tenants = await getAllTenants();
    
    return NextResponse.json({
      tenants,
      total: tenants.length,
    });
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar se o tema foi fornecido e tem a estrutura correta
    let theme: TenantTheme | undefined;
    if (body.theme) {
      const requiredFields = [
        'primary', 'primaryForeground', 'secondary', 'secondaryForeground',
        'accent', 'accentForeground', 'background', 'foreground',
        'muted', 'mutedForeground', 'border', 'input', 'ring',
        'destructive', 'destructiveForeground', 'success', 'successForeground',
        'warning', 'warningForeground'
      ];

      const isValidTheme = requiredFields.every(field => 
        field in body.theme && typeof body.theme[field] === 'string'
      );

      if (!isValidTheme) {
        return NextResponse.json(
          { error: 'Formato de tema inválido' },
          { status: 400 }
        );
      }

      theme = body.theme as TenantTheme;
    }

    const tenant = await createTenant(body.name, body.slug, theme);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Erro ao criar tenant. Verifique se o slug já não existe.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Tenant criado com sucesso',
      tenant,
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar tenant:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}