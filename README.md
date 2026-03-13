# SaaS Monorepo Template

<p align="center">
  <a href="https://github.com/brain-byt-es/nextjs-expo-monorepo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/brain-byt-es/nextjs-expo-monorepo/stargazers"><img src="https://img.shields.io/github/stars/brain-byt-es/nextjs-expo-monorepo?style=flat" alt="Stars"></a>
  <a href="https://github.com/brain-byt-es/nextjs-expo-monorepo/actions"><img src="https://img.shields.io/github/actions/workflow/status/brain-byt-es/nextjs-expo-monorepo/ci.yml?label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/Expo-SDK%2055-000020?logo=expo" alt="Expo SDK 55">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <a href="https://buymeacoffee.com/brainbytes"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-yellow" alt="Buy me a coffee"></a>
</p>

<p align="center">
  <strong>Production-ready SaaS starter — web + mobile, batteries included.</strong><br>
  Next.js 16 · Expo SDK 55 · Stripe · RevenueCat · Better-Auth · Drizzle ORM · Turborepo
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#whats-included">What's included</a> ·
  <a href="#features-walkthrough">Features</a> ·
  <a href="#deployment">Deploy</a>
</p>

<p align="center">
  <img src="docs/headerimage.png" alt="SaaS Monorepo Template — web dashboard + mobile app" width="100%">
</p>

---

> **Use this template** to ship a full SaaS product — web dashboard + iOS/Android app — in days instead of months. Every integration is wired up and working out of the box.

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
