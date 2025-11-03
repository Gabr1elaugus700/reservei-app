import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenantId?: string;
}

/**
 * Obtém o usuário atualmente autenticado a partir da sessão
 * @returns Usuário autenticado ou null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      tenantId: session.user.id, // Usando o ID do usuário como tenantId por enquanto
    };
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns true se autenticado, false caso contrário
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
