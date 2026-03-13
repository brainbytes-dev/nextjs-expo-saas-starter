# CLAUDE.md

## Project Overview

SaaS monorepo with a Next.js 16 web app and Expo React Native mobile app. Turborepo for orchestration, pnpm workspaces.

## Monorepo Structure

```
apps/
  web/          Next.js 16 — shadcn/ui, Better-Auth, Stripe, Inngest
  mobile/       Expo Router — NativewindUI, RevenueCat, Better-Auth (HTTP)
packages/
  db/           @repo/db — Drizzle ORM + PostgreSQL schema
  email/        @repo/email — React Email templates (Resend)
  shadcn-ui/    @repo/shadcn-ui — Web UI components (Radix + Tailwind v4)
  nativewindui/ @repo/nativewindui — Mobile UI components (NativeWind)
  typescript-config/  Shared tsconfig presets
  eslint-config/      Shared ESLint rules
```

## Commands

```bash
pnpm dev              # Start all apps (Turbo)
pnpm build            # Build all packages + apps
pnpm lint             # Lint everything
pnpm typecheck        # TypeScript check (mobile skipped — RN types incomplete)
pnpm test             # Run vitest (web only currently)

# Database (from root or packages/db)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly (dev)
pnpm db:studio        # Open Drizzle Studio

# Mobile
cd apps/mobile && pnpm dev     # Expo dev server
```

## Tech Stack

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | Next.js 16 (App Router) | Expo Router |
| UI | shadcn/ui (Radix + Tailwind v4) | NativewindUI (NativeWind) |
| Auth | Better-Auth (cookies, admin plugin) | Better-Auth via HTTP + AsyncStorage session |
| Payments | Stripe (checkout, portal, webhooks) | RevenueCat (IAP wrapper) |
| Database | Drizzle ORM + PostgreSQL | — (via web API) |
| Email | Resend + React Email templates | — (via web API) |
| Jobs | Inngest (event-driven + cron) | — |
| Rate Limit | Upstash Redis (sliding window, 10/min) | — |
| Analytics | PostHog (posthog-js) | PostHog (posthog-react-native) |
| Errors | Sentry (@sentry/nextjs) | Sentry (@sentry/react-native) |
| Testing | Vitest + happy-dom | — |
| CI/CD | GitHub Actions → Turbo | GitHub Actions → EAS Build |

## Authentication

- **Web**: Better-Auth with PostgreSQL, `admin()` plugin for RBAC
  - Config: `apps/web/src/lib/auth.ts`
  - Client: `apps/web/src/lib/auth-client.ts` — exports `useSession`, `signIn`, `signUp`, `signOut`
  - Middleware: `apps/web/src/middleware.ts` — protects `/dashboard/**` and `/admin/**`
  - Admin guard: `apps/web/src/app/admin/layout.tsx` — client-side role check
- **Mobile**: HTTP calls to web API + session in AsyncStorage
  - Client: `apps/mobile/src/lib/auth-client.ts`
  - Session store: `apps/mobile/src/lib/session-store.ts` — reactive `useSession()` hook

## Database Schema (packages/db)

5 tables in `packages/db/src/schema.ts`:
- `users` — id, email, name, role (user|admin)
- `user_subscriptions` — Stripe subscription tracking
- `payments` — Stripe payment records
- `mobile_subscriptions` — RevenueCat subscription tracking
- `mobile_payments` — RevenueCat payment records

Client: `getDb()` in `packages/db/src/index.ts` — lazy-initialized, max 10 connections.

> **Note**: Web app still uses Supabase JS client (`src/lib/supabase.ts`) in some webhook routes with `as any` casts. Migration to Drizzle is in progress.

## API Routes (apps/web)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...auth]` | * | Better-Auth handler |
| `/api/auth/update-profile` | POST | Update user profile |
| `/api/auth/change-password` | POST | Change password |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/portal` | POST | Create Stripe billing portal session |
| `/api/webhooks/stripe` | POST | Stripe webhook events |
| `/api/webhooks/revenuecat` | POST | RevenueCat webhook events |
| `/api/inngest` | GET/POST/PUT | Inngest function handler |
| `/api/admin/users` | GET/PATCH | Admin user management |
| `/api/email/welcome` | POST | Send welcome email |
| `/api/health` | GET | Health check (DB connectivity) |
| `/api/docs` | GET | OpenAPI spec |

## Inngest Jobs (apps/web/src/inngest/)

- `send-welcome-email` — event: `user/signup`, 3 retries
- `payment-failed-reminder` — event: `stripe/payment.failed`, 3 retries
- `subscription-canceled` — event: `stripe/subscription.canceled`, 3 retries
- `cleanup-sessions` — cron: daily 3 AM UTC

## Mobile App Routing

```
app/
  index.tsx                    → Redirect based on session
  _layout.tsx                  → Sentry.wrap + PostHog provider
  (auth)/
    index.tsx                  → Landing (Sign up / Log in)
    (login)/index.tsx          → Email + password login
    (login)/forgot-password.tsx
    (create-account)/index.tsx → Name step
    (create-account)/credentials.tsx → Email + password step
  (app)/
    _layout.tsx                → Tab navigator with auth guard
    index.tsx                  → Home/Dashboard
    subscription.tsx           → Paywall (RevenueCat)
    settings.tsx               → Profile + sign out
```

NativewindUI components resolve via babel alias: `@/components/nativewindui` → `packages/nativewindui`.

## Environment Variables

See `.env.example` for all required vars. Key groups:
- `BETTER_AUTH_*` — Auth secret + URL
- `STRIPE_*` / `NEXT_PUBLIC_STRIPE_*` — Payment processing
- `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` — Database (legacy, migrating to Drizzle)
- `DATABASE_URL` — PostgreSQL connection (for Drizzle)
- `RESEND_*` — Email service
- `UPSTASH_*` — Rate limiting (Redis)
- `SENTRY_*` / `EXPO_PUBLIC_SENTRY_*` — Error tracking
- `POSTHOG_*` / `EXPO_PUBLIC_POSTHOG_*` — Analytics
- `REVENUECAT_*` / `EXPO_PUBLIC_REVENUECAT_*` — Mobile IAP

## Key Patterns

- **Lazy initialization**: Stripe, Supabase, Resend, PostHog, and DB clients are all lazy-initialized to avoid build-time crashes when env vars are missing
- **Fail-open rate limiting**: `checkRateLimit()` returns `true` on Redis errors
- **Platform-adaptive UI**: Mobile screens use `Platform.select()` for iOS vs Android differences
- **Haptic feedback**: Auth screens use expo-haptics for validation errors and success
- **Event-driven**: Webhooks emit Inngest events; Inngest functions handle email/cleanup async

## CI/CD

- **Web**: `.github/workflows/ci.yml` — lint → typecheck → test → build on push/PR
- **Mobile**: `.github/workflows/mobile.yml` — EAS Build on `v*` git tags
