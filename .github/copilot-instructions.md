# Copilot Instructions for reservei-app

These notes teach AI agents how to work productively in this repository. Keep responses concise and actionable, cite concrete files, and follow the projects patterns.

## Architecture
- Framework: Next.js App Router (src/app) with TypeScript and Tailwind. UI lives under `src/app/**` and `src/components/**`.
- Data: PostgreSQL via Prisma. Client is exported from `src/lib/prisma.ts` with a single global instance and query logging enabled.
- Auth: `better-auth` with Prisma adapter (`src/lib/auth.ts`). Sessions are exposed to Next routes via `toNextJsHandler` in `src/app/api/auth/[...all]/route.ts` and helpers in `src/lib/auth-service.ts`.
- Domain: booking and capacity management.
  - Core models in `prisma/schema.prisma`: `Customer`, `Booking`, `WeeklyCapacity`, `SpecialDateCapacity`, `ScheduleConfig`, `SpecialDateSchedule`, plus auth tables (`User`, `Session`, `Account`, etc.).
  - Capacity logic centralized in `src/lib/capacity-service.ts` (CRUD and read APIs for weekly/special limits; transactions for bulk updates).
- APIs: Route handlers under `src/app/api/**` perform auth via `getCurrentUser()` and delegate to services.
- Caching: Client-side localStorage wrapper in `src/lib/cache-service.ts` with TTL and namespacing.
- Integrations: `src/lib/redis.ts` (local Redis at 127.0.0.1:6379) and `src/lib/rabbit.ts` (AMQP at amqp://guest:guest@localhost). A worker placeholder exists at `src/worker/bookingWorker.ts`.

## Developer workflows
- Dev server: `npm run dev` (Next.js). Build with `npm run build`, start with `npm run start`.
- Lint: `npm run lint` (eslint config: `eslint.config.mjs`). TypeScript config in `tsconfig.json`.
- Database: Prisma schema at `prisma/schema.prisma`. Seed in `prisma/seed.ts` (script configured in `package.json`'s `prisma.seed`). Migrations live in `prisma/migrations/**`.
- Env: Needs `DATABASE_URL` for Prisma. Auth/session cookies handled by `better-auth` (see `src/lib/auth.ts`). Redis/RabbitMQ are optional and currently default to local services.

## Patterns and conventions
- API route shape: Always check auth early using `getCurrentUser()` and return `401` JSON when unauthenticated.
  - Example: `src/app/api/capacity/route.ts` and `src/app/api/bookings/route.ts`.
- Validation: Perform minimal runtime checks on request bodies and query params inside route handlers; return localized error messages and appropriate HTTP status codes (400 for validation, 409 for unique constraint, 500 fallback).
  - Example: `POST /api/capacity` validates weekly/special date payloads; `POST /api/capacity/special-dates` maps Prisma P2002 to 409.
- Services first: Business logic goes in `src/lib/*-service.ts` and is called from routes. Prefer `$transaction` for multi-entity writes (see `saveCapacityConfiguration`).
- Dates: Capacities store weekly by `dayOfWeek` (0-6) and special dates as `Date` without time; API serializes special dates as `YYYY-MM-DD` strings.
- Prisma usage: Use the shared `prisma` instance from `src/lib/prisma.ts`. In transactions, use the passed `tx` client.
- Auth usage: Use `auth.api.getSession({ headers: await headers() })` inside server contexts to retrieve the current user (`src/lib/auth-service.ts`).
- Client hooks: Feature-specific state and API calls live in hooks like `src/hooks/use-capacity-management.ts` which mirrors the API contract and maps UI state to payloads.
- Middleware: `src/middleware.ts` protects `/dashboard` using `better-auth` cookie; extend `config.matcher` for new protected paths.

## How to extend safely
- Adding an API:
  1) Create a route under `src/app/api/<feature>/route.ts` (or subroutes).
  2) Authenticate first, validate inputs, then call a service in `src/lib/`.
  3) Return `{ success: boolean, data?|message?|error? }` JSON and proper status.
- Adding data logic: Put database code in `src/lib/<feature>-service.ts`. Reuse transactions for bulk updates and keep serialization consistent with existing endpoints.
- Adding models: Update `prisma/schema.prisma`, run migrations, and adjust services/APIs accordingly. Respect existing unique constraints like `@@unique([dayOfWeek])` and `@@unique([date])` for capacity tables.
- Client features: Backed by a hook in `src/hooks/**`. Keep payloads aligned with current API contracts and prefer optimistic UI followed by server persistence (see `addSpecialDate`).

## Examples to copy
- Capacity config GET/POST: `src/app/api/capacity/route.ts` + `src/lib/capacity-service.ts`.
- Auth route wiring: `src/app/api/auth/[...all]/route.ts` and `src/lib/auth.ts`.
- Prisma client pattern: `src/lib/prisma.ts` with global caching and query logs.

## Notes
- Query logging is enabled for Prisma; avoid spamming logs in production services.
- Redis and RabbitMQ clients are local defaults; make connection strings configurable before using in production.
