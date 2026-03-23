# Contributing — Zentory

Zentory ist proprietäre Software der HR Online Consulting LLC. Nur autorisierte Teammitglieder haben Schreibzugriff.

## Development Setup

1. Repo klonen: `git clone git@github.com:brainbytes-dev/lager-app.git`
2. Dependencies: `pnpm install`
3. Environment: `.env.example` → `.env.local` (Credentials vom Team holen)
4. DB: `pnpm db:push`
5. Dev-Server: `pnpm dev` (läuft auf Port 3003)

## Workflow

1. Branch von `main` erstellen: `git checkout -b feat/mein-feature`
2. Änderungen machen
3. Checks laufen lassen:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
4. Commit mit klarer Message: `feat: barcode scanner`, `fix: login redirect`
5. PR gegen `main` öffnen
6. Code Review abwarten → Merge

## Konventionen

- **Sprache im Code:** Englisch (Variablen, Funktionen, Kommentare)
- **UI-Texte:** Deutsch als Default, via `useTranslations()` (next-intl)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches:** `feat/`, `fix/`, `chore/` Prefix
- **Keine direkten Pushes auf `main`** — immer PR

## Architektur

- Web: `apps/web/` — Next.js 16, App Router
- Mobile: `apps/mobile/` — Expo Router
- DB Schema: `packages/db/src/schema.ts` — Single Source of Truth
- API: `apps/web/src/app/api/` — Route Handlers
- i18n: `apps/web/src/i18n/messages/` — DE/EN/FR/IT

## Fragen?

Slack: #zentory-dev oder direkt an das Entwicklungsteam.
