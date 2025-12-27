import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
	const hostname = request.headers.get("host") || "";
	const url = request.nextUrl;
	
	// Domínios configuráveis via env
	const adminSubdomain = process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN || "app";
	const publicSubdomain = process.env.NEXT_PUBLIC_PUBLIC_SUBDOMAIN || "reservas";
	const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "";
	
	// Em desenvolvimento, ignora lógica de subdomínios
	const isDev = process.env.NODE_ENV === "development";
	
	if (!isDev && baseDomain) {
		// Detecta subdomínio administrativo (ex: app.seudominio.com)
		if (hostname === `${adminSubdomain}.${baseDomain}` || hostname.startsWith(`${adminSubdomain}.`)) {
			// Força roteamento para /dashboard
			if (!url.pathname.startsWith("/dashboard") && 
			    !url.pathname.startsWith("/api") && 
			    !url.pathname.startsWith("/_next") &&
			    !url.pathname.startsWith("/auth")) {
				return NextResponse.rewrite(new URL("/dashboard" + url.pathname, request.url));
			}
			
			// Verifica autenticação para rotas /dashboard
			if (url.pathname.startsWith("/dashboard")) {
				const sessionCookie = getSessionCookie(request);
				if (!sessionCookie) {
					return NextResponse.redirect(new URL(`https://${publicSubdomain}.${baseDomain}/auth/login`, request.url));
				}
			}
		}
		
		// Detecta subdomínio público (ex: reservas.seudominio.com)
		if (hostname === `${publicSubdomain}.${baseDomain}` || hostname.startsWith(`${publicSubdomain}.`)) {
			// Bloqueia acesso direto ao /dashboard no subdomínio público
			if (url.pathname.startsWith("/dashboard")) {
				return NextResponse.redirect(new URL(`https://${adminSubdomain}.${baseDomain}/dashboard`, request.url));
			}
		}
	}
	
	// Lógica padrão para rotas /dashboard em ambiente dev ou domínio único
	if (url.pathname.startsWith("/dashboard")) {
		const sessionCookie = getSessionCookie(request);
		if (!sessionCookie) {
			return NextResponse.redirect(new URL("/auth/login", request.url));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next|static|favicon.ico).*)"],
};