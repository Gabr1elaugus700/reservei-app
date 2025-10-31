import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/features/booking/auth/signin',
  '/features/booking/auth/signup',
  '/features/booking/auth',
  '/api/auth',
]

// Função para verificar se a rota é pública
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acesso a rotas públicas e assets estáticos
  if (isPublicRoute(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Verificar sessão
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    // Se não há sessão e está tentando acessar rota protegida, redirecionar para auth
    if (!session) {
      const authUrl = new URL('/features/booking/auth', request.url)
      authUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(authUrl)
    }

    return NextResponse.next()
  } catch {
    // Em caso de erro na verificação, redirecionar para auth
    const authUrl = new URL('/features/booking/auth', request.url)
    return NextResponse.redirect(authUrl)
  }
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
