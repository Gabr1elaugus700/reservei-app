import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  // Verificar se existe cookie de sessão do better-auth
  // Better-auth usa cookies para manter a sessão
  const sessionToken = request.cookies.get('better-auth.session_token')
  
  // Se não há cookie de sessão, redirecionar para auth
  if (!sessionToken) {
    const authUrl = new URL('/features/booking/auth', request.url)
    authUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(authUrl)
  }

  return NextResponse.next()
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
