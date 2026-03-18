-- Migration: Add auto-reorder columns to alert_settings
-- Run: pnpm db:migrate

ALTER TABLE "alert_settings"
  ADD COLUMN IF NOT EXISTS "auto_reorder" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reorder_target_multiplier" integer NOT NULL DEFAULT 2;
