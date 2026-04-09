# Autenticação e Autorização

> Documentação completa do sistema de autenticação com better-auth, proteção de rotas e multi-tenancy.

## 🔐 Visão Geral

O sistema utiliza **better-auth** para gerenciar autenticação e sessões, com suporte a:
- Autenticação email/senha
- Sessões com expiração configurável (7 dias)
- Multi-tenancy via Organizations
- Proteção de rotas via middleware
- Integração Next.js (App Router)

---

## 📐 Arquitetura de Autenticação

```
┌─────────────────────────────────────────────────┐
│               CAMADAS DE AUTH                   │
└─────────────────────────────────────────────────┘

Browser                 Server
   │                      │
   │  1. Login Form       │
   ├──────────────────────►  POST /api/auth/sign-in/email
   │                      │    ↓
   │                      │  better-auth valida credenciais
   │                      │    ↓
   │  ◄──────────────────┤  Set-Cookie: session_token
   │  2. Session Cookie   │
   │                      │
   │  3. Request          │
   ├──────────────────────►  GET /api/bookings
   │  Cookie: session     │    ↓
   │                      │  Middleware verifica cookie
   │                      │    ↓
   │                      │  getCurrentUser() → User data
   │                      │    ↓
   │  ◄──────────────────┤  Response com dados
   │  4. Protected Data   │
```

---

## 🔧 Configuração do better-auth

### Server Config ([src/lib/auth.ts](../../src/lib/auth.ts))

```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { organization } from 'better-auth/plugins/organization';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  emailAndPassword: {
    enabled: true,
  },
  
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 dias
  },
  
  plugins: [
    organization(),      // Multi-tenancy
    nextCookies(),      // Integração Next.js
  ],
  
  trustedOrigins: [
    "http://localhost:3000",
    "https://reservas.app-reservei.com.br",
    "https://app.app-reservei.com.br",
  ],
});
```

**Configurações-chave**:
- `secret`: Salt para criptografia de sessions (obrigatório em produção)
- `baseURL`: URL base da aplicação (usado para callbacks)
- `session.expiresIn`: Tempo de vida da sessão em segundos
- `trustedOrigins`: URLs permitidas para CORS

---

### Client Config ([src/lib/auth-client.ts](../../src/lib/auth-client.ts))

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 
           (typeof window !== 'undefined' ? window.location.origin : '')
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
```

**Hooks exportados**:
- `useSession()` — Acessa sessão atual (client-side)
- `signIn()` — Função de login
- `signOut()` — Função de logout
- `signUp()` — Função de registro

---

## 🚪 Fluxo de Autenticação

### 1. Sign Up (Criar Conta)

**UI**: [src/app/auth/signup/page.tsx](../../src/app/auth/signup/page.tsx)

**Server Action**: [src/app/auth/auth.ts](../../src/app/auth/auth.ts)

```typescript
async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  await auth.api.signUpEmail({
    email,
    password,
    name,
    headers: await headers(),
  });

  redirect('/dashboard');
}
```

**Processamento better-auth**:
1. Valida email único (constraint Prisma)
2. Hash da senha com bcrypt
3. Cria registro em `User` e `Account`
4. Cria `Session` com token único
5. Set cookie `better-auth.session_token`

**Resposta**:
- ✅ Sucesso: Redireciona para `/dashboard`
- ❌ Erro 409: Email já existe
- ❌ Erro 400: Campos inválidos

---

### 2. Sign In (Login)

**UI**: [src/app/auth/signin/page.tsx](../../src/app/auth/signin/page.tsx)

**Server Action**:
```typescript
async function signInAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  await auth.api.signInEmail({
    email,
    password,
    headers: await headers(),
  });

  redirect('/dashboard');
}
```

**Processamento**:
1. Busca `Account` por email
2. Verifica hash da senha (bcrypt.compare)
3. Cria nova `Session`
4. Set cookie com session token

**Resposta**:
- ✅ Sucesso: Redireciona para `/dashboard`
- ❌ Erro 401: Credenciais inválidas

---

### 3. Sign Out (Logout)

```typescript
async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect('/auth');
}
```

**Processamento**:
1. Deleta registro de `Session` do banco
2. Remove cookie `better-auth.session_token`
3. Redireciona para `/auth`

---

## 🛡️ Proteção de Rotas

### Middleware ([src/middleware.ts](../../src/middleware.ts))

**Estratégia**: Verificação de session cookie antes de permitir acesso.

```typescript
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextResponse, type NextRequest } from "next/server";

export default async function authMiddleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

**Lógica**:
1. Extrai cookie da requisição
2. Chama `/api/auth/get-session` com cookie
3. Se sessão inválida/ausente → redireciona para `/auth/login`
4. Se válida → permite acesso

**Rotas protegidas**:
- `/dashboard/*` — Qualquer rota sob dashboard

---

### Multi-Subdomain Support

**Variáveis de ambiente**:
```env
NEXT_PUBLIC_ADMIN_SUBDOMAIN=app
NEXT_PUBLIC_PUBLIC_SUBDOMAIN=reservas
NEXT_PUBLIC_BASE_DOMAIN=app-reservei.com.br
```

**Lógica de redirecionamento**:

| Subdomínio | Rota | Autenticação | Ação |
|------------|------|--------------|------|
| `app.app-reservei.com.br` | `/dashboard` | Requerida | Verifica sessão, bloqueia não-autenticados |
| `app.app-reservei.com.br` | `/auth/login` | Pública | Permite acesso |
| `reservas.app-reservei.com.br` | `/dashboard` | — | Redireciona para `app.` |
| `reservas.app-reservei.com.br` | `/` | Pública | Página de reservas pública |

**Implementação** (no middleware):
```typescript
const host = request.headers.get('host');
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;

if (baseDomain && host) {
  const adminSubdomain = process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN;
  const publicSubdomain = process.env.NEXT_PUBLIC_PUBLIC_SUBDOMAIN;

  const isAdmin = host.startsWith(`${adminSubdomain}.`);
  const isPublic = host.startsWith(`${publicSubdomain}.`);

  // Bloquear acesso a /dashboard no subdomínio público
  if (isPublic && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(
      `https://${adminSubdomain}.${baseDomain}/dashboard`
    );
  }
}
```

---

## 👤 Server-Side: getCurrentUser()

**Localização**: [src/lib/auth-service.ts](../../src/lib/auth-service.ts)

**Propósito**: Obter usuário autenticado em server components e API routes.

```typescript
import { auth } from './auth';
import { headers } from 'next/headers';

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    tenantId: session.session.activeOrganizationId || null
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
```

**Uso em API Route**:
```typescript
import { getCurrentUser } from '@/lib/auth-service';

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Continuar com lógica autenticada...
}
```

**Uso em Server Component**:
```typescript
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/auth/login');

  return <div>Olá, {user.name}</div>;
}
```

---

## 🏢 Multi-Tenancy (Organizations)

### Modelos Relacionados

**Referência**: [DATABASE.md](./DATABASE.md) — Seção "Autenticação e Multi-tenancy"

- **Organization** — Empresas/tenants
- **Member** — Associação User ↔ Organization com role
- **Invitation** — Convites pendentes

### Fluxo típico

1. **Criar Organização**:
```typescript
const org = await prisma.organization.create({
  data: {
    name: "Restaurante Exemplo",
    slug: "restaurante-exemplo",
  }
});
```

2. **Adicionar Membro**:
```typescript
await prisma.member.create({
  data: {
    userId: user.id,
    organizationId: org.id,
    role: "admin"
  }
});
```

3. **Session com Organização Ativa**:
```typescript
// Session armazena activeOrganizationId
const session = await getSession();
const orgId = session.session.activeOrganizationId;
```

4. **Filtrar Dados por Tenant**:
```typescript
const bookings = await prisma.booking.findMany({
  where: {
    // Assumindo que Booking teria organizationId
    organizationId: orgId
  }
});
```

**⚠️ Nota**: Multi-tenancy está configurado mas **não totalmente implementado** na aplicação atual. Modelos `Organization`, `Member` e `Invitation` existem mas não são usados ativamente nas rotas de negócio (Bookings, TimeSlots).

---

## 🔑 Variáveis de Ambiente Necessárias

```env
# Auth Secret (OBRIGATÓRIO em produção)
BETTER_AUTH_SECRET=seu-segredo-super-secreto-mude-aqui

# URLs
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Multi-tenant/Subdomínio (opcional)
NEXT_PUBLIC_ADMIN_SUBDOMAIN=app
NEXT_PUBLIC_PUBLIC_SUBDOMAIN=reservas
NEXT_PUBLIC_BASE_DOMAIN=app-reservei.com.br
```

**Geração de SECRET**:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

---

## 📊 Diagrama de Fluxo de Autenticação

```
┌──────────────────────────────────────────────────────┐
│          FLUXO COMPLETO DE AUTENTICAÇÃO              │
└──────────────────────────────────────────────────────┘

1. Usuário acessa /dashboard
   ↓
2. Middleware intercepta request
   ↓
3. Extrai cookie: better-auth.session_token
   ↓
4. Chama auth.api.getSession({ headers })
   ↓
5a. Session válida?
    ├─ SIM → NextResponse.next() → Renderiza /dashboard
    └─ NÃO → Redirect('/auth/login')
              ↓
6. Usuário preenche email/senha
   ↓
7. Server Action: signInAction()
   ↓
8. auth.api.signInEmail({ email, password, headers })
   ↓
9. better-auth:
   ├─ Busca Account por email
   ├─ Verifica password (bcrypt)
   ├─ Cria Session com token único
   └─ Set-Cookie: better-auth.session_token
   ↓
10. Redirect('/dashboard')
    ↓
11. Middleware agora encontra session válida
    ↓
12. Renderiza dashboard com user data
```

---

## 🔍 Debugging de Autenticação

### Verificar Sessão Atual (Browser Console)

```javascript
// Fetch session data
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log);
```

### Verificar Cookie (DevTools)

1. Abrir DevTools → Application → Cookies
2. Buscar: `better-auth.session_token`
3. Verificar:
   - Value: token aleatório
   - HttpOnly: ✅ true
   - Secure: ✅ true (em produção)
   - Expires: 7 dias no futuro

### Logs Server-Side

```typescript
export async function GET() {
  const user = await getCurrentUser();
  console.log('[DEBUG] Current user:', user);
  
  if (!user) {
    console.log('[DEBUG] No user found, session expired or invalid');
  }
}
```

---

## 🚨 Segurança Best Practices

### ✅ Implementado

- ✅ Senhas com hash bcrypt
- ✅ Session tokens aleatórios e únicos
- ✅ Cookies HttpOnly (previne XSS)
- ✅ Cookies Secure em produção (HTTPS only)
- ✅ Expiração de sessões (7 dias)
- ✅ Validação de origens confiáveis (CORS)

### ⚠️ Recomendações Adicionais

- ⚠️ **Rate limiting** em endpoints de login (prevenir brute force)
- ⚠️ **Email verification** (emailVerified está no schema mas não enforced)
- ⚠️ **2FA** (two-factor authentication) para admins
- ⚠️ **Password reset** flow (models existem mas sem implementação)
- ⚠️ **CSRF protection** (considerar para forms críticos)

---

## 🔗 Referências Relacionadas

- **Modelos de Banco**: [DATABASE.md](./DATABASE.md) — User, Session, Account, Organization
- **APIs**: [API_REFERENCE.md](./API_REFERENCE.md) — Seção "Autenticação"
- **Middleware**: [DEVELOPMENT_PATTERNS.md](./DEVELOPMENT_PATTERNS.md) — Padrões de proteção
- **Setup**: [SETUP.md](./SETUP.md) — Configuração de variáveis de ambiente

---

**Última atualização**: 9 de abril de 2026
