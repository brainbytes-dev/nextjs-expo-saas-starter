#!/usr/bin/env bash
set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

step() { echo -e "\n${BOLD}$1${RESET}"; }
ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; exit 1; }

echo -e "${BOLD}SaaS Monorepo — Setup${RESET}"
echo "────────────────────────────────────"

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
step "Checking prerequisites"

node_version=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$node_version" ] || [ "$node_version" -lt 20 ]; then
  fail "Node.js >= 20 required (found: $(node --version 2>/dev/null || echo 'not installed'))"
fi
ok "Node.js $(node --version)"

if ! command -v pnpm &>/dev/null; then
  fail "pnpm not found — install with: npm install -g pnpm"
fi
ok "pnpm $(pnpm --version)"

# ── 2. Install dependencies ───────────────────────────────────────────────────
step "Installing dependencies"
pnpm install --frozen-lockfile
ok "Dependencies installed"

# ── 3. Environment file ───────────────────────────────────────────────────────
step "Environment configuration"

if [ -f ".env.local" ]; then
  ok ".env.local already exists — skipping"
else
  cp .env.example .env.local
  ok "Created .env.local from .env.example"
  warn "Edit .env.local and fill in your credentials before running the app"
fi

# ── 4. Database ───────────────────────────────────────────────────────────────
step "Database"

if grep -q "postgresql://postgres:postgres@localhost" .env.local 2>/dev/null; then
  warn "DATABASE_URL looks like the default placeholder — update it in .env.local first"
  warn "Then run: pnpm db:migrate"
else
  if command -v psql &>/dev/null && [ -n "$DATABASE_URL" ]; then
    cd packages/db && pnpm db:migrate && cd ../..
    ok "Migrations applied"
  else
    warn "Skipping migrations — run manually: pnpm db:migrate"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Setup complete.${RESET}"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your credentials"
echo "  2. Run: pnpm db:migrate"
echo "  3. Run: pnpm dev"
echo ""
echo "Web:    http://localhost:3003"
echo "Mobile: cd apps/mobile && pnpm dev"
echo ""
