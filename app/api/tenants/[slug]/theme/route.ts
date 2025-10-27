import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, updateTenantTheme } from '../../../../lib/tenant-service';
import { getTenantTheme, TenantTheme } from '../../../../lib/theme-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug do tenant é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o tenant no banco de dados
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      );
    }

    // Obter o tema do tenant (seja customizado ou padrão)
    const theme = getTenantTheme(slug, tenant.theme || undefined);

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      theme,
    });

  } catch (error) {
    console.error('Erro ao buscar tema do tenant:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug do tenant é obrigatório' },
        { status: 400 }
      );
    }

    if (!body.theme) {
      return NextResponse.json(
        { error: 'Tema é obrigatório' },
        { status: 400 }
      );
    }

    // Validar se o corpo da requisição tem a estrutura correta de TenantTheme
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

    // Buscar o tenant pelo slug primeiro para pegar o ID
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o tema
    const success = await updateTenantTheme(tenant.id, body.theme as TenantTheme);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao salvar tema' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tema atualizado com sucesso',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      theme: body.theme,
    });

  } catch (error) {
    console.error('Erro ao atualizar tema:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}