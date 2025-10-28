import { TenantTheme } from './theme-manager';
import { prisma } from './prisma';

export interface TenantWithTheme {
  id: string;
  name: string;
  slug: string;
  theme: TenantTheme | null;
  createdAt: Date;
  updatedAt: Date;
}

// Função para converter o JSON do banco em TenantTheme
export function parseTenantTheme(themeJson: unknown): TenantTheme | null {
  if (!themeJson || typeof themeJson !== 'object' || themeJson === null) {
    return null;
  }

  const theme = themeJson as Record<string, unknown>;

  // Validar se tem todas as propriedades necessárias
  const requiredFields: (keyof TenantTheme)[] = [
    'primary', 'primaryForeground', 'secondary', 'secondaryForeground',
    'accent', 'accentForeground', 'background', 'foreground',
    'muted', 'mutedForeground', 'border', 'input', 'ring',
    'destructive', 'destructiveForeground', 'success', 'successForeground',
    'warning', 'warningForeground'
  ];

  const isValid = requiredFields.every(field => 
    field in theme && typeof theme[field] === 'string'
  );

  return isValid ? (theme as unknown as TenantTheme) : null;
}

// Função para serializar o tema para salvar no banco
export function serializeTenantTheme(theme: TenantTheme): object {
  return {
    primary: theme.primary,
    primaryForeground: theme.primaryForeground,
    secondary: theme.secondary,
    secondaryForeground: theme.secondaryForeground,
    accent: theme.accent,
    accentForeground: theme.accentForeground,
    background: theme.background,
    foreground: theme.foreground,
    muted: theme.muted,
    mutedForeground: theme.mutedForeground,
    border: theme.border,
    input: theme.input,
    ring: theme.ring,
    destructive: theme.destructive,
    destructiveForeground: theme.destructiveForeground,
    success: theme.success,
    successForeground: theme.successForeground,
    warning: theme.warning,
    warningForeground: theme.warningForeground,
  };
}

// Buscar tenant no banco de dados usando Prisma
export async function getTenantBySlug(slug: string): Promise<TenantWithTheme | null> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      theme: parseTenantTheme(tenant.theme),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  } catch (error) {
    console.error('Erro ao buscar tenant:', error);
    return null;
  }
}

// Salvar tema do tenant no banco de dados usando Prisma
export async function updateTenantTheme(tenantId: string, theme: TenantTheme): Promise<boolean> {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { theme: serializeTenantTheme(theme) },
    });
    
    console.log('Tema salvo para tenant:', tenantId);
    return true;
  } catch (error) {
    console.error('Erro ao salvar tema:', error);
    return false;
  }
}

// Criar um novo tenant com tema
export async function createTenant(name: string, slug: string, theme?: TenantTheme): Promise<TenantWithTheme | null> {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        theme: theme ? serializeTenantTheme(theme) : undefined,
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      theme: theme || null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  } catch (error) {
    console.error('Erro ao criar tenant:', error);
    return null;
  }
}

// Listar todos os tenants
export async function getAllTenants(): Promise<TenantWithTheme[]> {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const result: TenantWithTheme[] = [];
    for (const tenant of tenants) {
      result.push({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        theme: parseTenantTheme(tenant.theme),
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      });
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    return [];
  }
}