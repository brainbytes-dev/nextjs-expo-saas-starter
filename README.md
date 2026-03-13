# SaaS Monorepo Template

Production-ready SaaS starter with a **Next.js 16** web app and **Expo** React Native mobile app, orchestrated by **Turborepo** + **pnpm workspaces**.

## What's included

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | Next.js 16 (App Router) | Expo Router |
| UI | shadcn/ui — Radix + Tailwind v4 | NativewindUI — NativeWind |
| Auth | Better-Auth (RBAC via admin plugin) | Better-Auth HTTP + AsyncStorage |
| Payments | Stripe — Checkout, Portal, Webhooks | RevenueCat — IAP (iOS + Android) |
| Database | Drizzle ORM + PostgreSQL | via Web API |
| Email | Resend + React Email templates | via Web API |
| Background Jobs | Inngest — event-driven + cron | — |
| Rate Limiting | Upstash Redis | — |
| Analytics | PostHog | PostHog |
| Error Tracking | Sentry | Sentry |
| Tracing | OpenTelemetry (OTLP) | — |
| Feature Flags | PostHog (server + client) | — |
| Canary Rollouts | Vercel Edge Config | — |
| Testing | Vitest + happy-dom | — |
| CI/CD | GitHub Actions → Vercel | GitHub Actions → EAS Build |

## Project structure

```
apps/
  web/          Next.js 16 — dashboard, auth, billing, admin panel
  mobile/       Expo Router — iOS & Android with NativewindUI
packages/
  db/           @repo/db — Drizzle ORM schema + migrations
  email/        @repo/email — React Email templates
  shadcn-ui/    @repo/shadcn-ui — web UI components
  nativewindui/ @repo/nativewindui — mobile UI components
  typescript-config/  shared tsconfig presets
  eslint-config/      shared ESLint rules
```

## Quick start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10.32
- **PostgreSQL** — local or hosted (Supabase, Neon, Railway, …)

### Setup

```bash
# 1. Clone and run the setup script
pnpm setup

# 2. Fill in .env.local (the script creates it from .env.example)
#    Minimum required: DATABASE_URL, BETTER_AUTH_SECRET

# 3. Run migrations
pnpm db:migrate

# 4. Start all apps
pnpm dev
```

Web → `http://localhost:3003`
Mobile → `cd apps/mobile && pnpm dev` (Expo Go / simulator)

### Environment variables

Copy `.env.example` to `.env.local` and fill in your credentials.

**Minimum to run locally:**

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3003` |

Everything else (Stripe, RevenueCat, Sentry, …) is optional locally — the app degrades gracefully when services are unconfigured.

## Commands

```bash
pnpm setup            # First-time setup (install + .env.local + migration hint)
pnpm dev              # Start all apps
pnpm build            # Build all packages + apps
pnpm lint             # Lint everything
pnpm typecheck        # TypeScript check
pnpm test             # Vitest (web)

# Database
pnpm db:generate      # Generate Drizzle migrations from schema changes
pnpm db:migrate       # Apply migrations to the database
pnpm db:push          # Push schema directly (dev, no migration file)
pnpm db:studio        # Open Drizzle Studio
```

## Features walkthrough

### Authentication (Better-Auth)
- Email + password sign-up / sign-in
- Admin RBAC via `admin()` plugin — role management at `/admin`
- Middleware protects `/dashboard/**` and `/admin/**`
- Mobile uses HTTP-based auth with AsyncStorage session

### Payments
- **Web (Stripe):** checkout session → subscription → billing portal
- **Mobile (RevenueCat):** wraps Apple StoreKit + Google Play Billing
- Webhook handlers for both at `/api/webhooks/stripe` and `/api/webhooks/revenuecat`

### Database
5 tables managed with Drizzle ORM: `users`, `user_subscriptions`, `payments`, `mobile_subscriptions`, `mobile_payments`

### Background jobs (Inngest)
| Function | Trigger |
|----------|---------|
| `send-welcome-email` | `user/signup` event |
| `payment-failed-reminder` | `stripe/payment.failed` event |
| `subscription-canceled` | `stripe/subscription.canceled` event |
| `cleanup-sessions` | Cron — daily 3 AM UTC |

### Observability
- **Sentry** — error boundaries + exception capture
- **PostHog** — analytics + feature flags (server + client)
- **OpenTelemetry** — OTLP trace export, 10% sample rate in prod
- **Vercel Edge Config** — canary rollouts + kill switches (<1ms reads)

## Deployment

### Web (Vercel)
1. Import repo → Vercel auto-detects Next.js
2. Set environment variables from `.env.example`
3. Link an Edge Config store (optional, for canary rollouts)

### Mobile (EAS Build)
```bash
cd apps/mobile
eas build --platform all   # Production builds
eas submit                 # Submit to App Store + Play Store
```

CI automatically builds on `v*` git tags via `.github/workflows/mobile.yml`.

## Documentation

- [SAAS_SETUP.md](SAAS_SETUP.md) — Step-by-step third-party service setup
- [STRIPE_WEBHOOK_SETUP.md](STRIPE_WEBHOOK_SETUP.md) — Stripe webhook configuration
- [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md) — RevenueCat mobile IAP setup
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines
- [CLAUDE.md](CLAUDE.md) — Full technical reference (AI-assisted dev context)

## License

MIT — see [LICENSE](LICENSE) for details.
