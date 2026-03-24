-- Migration: Add status column to keys table
-- Status values: "available" | "issued" | "lost" | "defective" | "retired"

ALTER TABLE "keys"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'available';
