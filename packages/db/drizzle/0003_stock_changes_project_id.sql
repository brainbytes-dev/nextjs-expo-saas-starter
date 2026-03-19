-- Migration: Add project_id (Kostenstelle) to stock_changes
-- Run: pnpm db:migrate  OR  execute manually against your PostgreSQL instance

ALTER TABLE "stock_changes"
  ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_stock_changes_project_id"
  ON "stock_changes"("project_id");
