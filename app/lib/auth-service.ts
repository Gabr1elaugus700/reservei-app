import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantSlug?: string;
}

// Função para criar hash da senha
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Função para verificar senha
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Função para gerar JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Função para verificar JWT token
export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

// Função para fazer login
export async function loginUser(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | null> {
  try {
    const { email, password, tenantSlug } = credentials;

    // Buscar usuário com tenant
    const whereClause = tenantSlug 
      ? { email, tenant: { slug: tenantSlug } }
      : { email };

    const user = await prisma.user.findFirst({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };

    const token = generateToken(authUser);

    return { user: authUser, token };
  } catch (error) {
    console.error('Erro no login:', error);
    return null;
  }
}

// Função para registrar usuário
export async function registerUser(data: RegisterData): Promise<{ user: AuthUser; token: string } | null> {
  try {
    const { email, password, name, tenantSlug } = data;

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Usuário já existe com este email');
    }

    // Buscar tenant (usar default se não especificado)
    let tenant;
    if (tenantSlug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });
    } else {
      // Buscar tenant padrão ou criar um
      tenant = await prisma.tenant.findFirst({
        where: { slug: 'default' },
      });

      if (!tenant) {
        // Criar tenant padrão se não existir
        tenant = await prisma.tenant.create({
          data: {
            name: 'Default',
            slug: 'default',
          },
        });
      }
    }

    if (!tenant) {
      throw new Error('Tenant não encontrado');
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tenantId: tenant.id,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };

    const token = generateToken(authUser);

    return { user: authUser, token };
  } catch (error) {
    console.error('Erro no registro:', error);
    return null;
  }
}

// Função para buscar usuário pelo token
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };
  } catch (error) {
    console.error('Erro ao buscar usuário pelo token:', error);
    return null;
  }
}

// Obter usuário atual a partir do request
export async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('cookie')?.split('token=')[1]?.split(';')[0];

    if (!token) {
      return null;
    }

    return await getUserFromToken(token);
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}