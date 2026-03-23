# Zentory

**Inventar- und Werkzeugverwaltung für Schweizer KMU.**

Zu gross für Excel. Zu schlau für SAP.

---

## Tech Stack

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | Next.js 16 (App Router) | Expo Router (SDK 55) |
| UI | shadcn/ui + Tailwind v4 | NativewindUI |
| Auth | Better-Auth | Better-Auth (HTTP) |
| Payments | Stripe | — |
| Database | Drizzle ORM + PostgreSQL (Supabase) | via Web API |
| Email | Resend + React Email | — |
| Jobs | Inngest | — |
| i18n | next-intl (DE/FR/IT/EN) | — |

## Monorepo-Struktur

```
apps/
  web/          Next.js — Dashboard, Landing, API
  mobile/       Expo Router — iOS & Android
  docs/         Nextra 3 — docs.zentory.ch
packages/
  db/           Drizzle ORM + Schema (60+ Tabellen)
  email/        React Email Templates
  shadcn-ui/    Web UI-Komponenten
  nativewindui/ Mobile UI-Komponenten
```

## Setup

```bash
pnpm install
cp .env.example .env.local   # Credentials eintragen
pnpm db:push                 # Schema in Supabase pushen
pnpm dev                     # Alle Apps starten
```

## Commands

| Command | Beschreibung |
|---------|-------------|
| `pnpm dev` | Alle Apps starten (Turbo) |
| `pnpm build` | Production Build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript prüfen |
| `pnpm test` | Vitest (Web) |
| `pnpm db:push` | Schema direkt pushen |
| `pnpm db:studio` | Drizzle Studio öffnen |

## Deployment

- **Web:** Vercel (zentory.ch)
- **Docs:** Vercel (docs.zentory.ch)
- **DB:** Supabase (eu-central-2)
- **Mobile:** EAS Build (ch.zentory.app)

## Lizenz

Proprietary — HR Online Consulting LLC, DBA Zentory. Siehe [LICENSE](LICENSE).
