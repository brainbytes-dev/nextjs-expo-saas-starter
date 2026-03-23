-- Migration: Rebrand LogistikApp → Zentory
-- Rename column in reseller_branding table

ALTER TABLE "reseller_branding"
  RENAME COLUMN "hide_logistikapp_branding" TO "hide_zentory_branding";

-- Update demo account email if not already done
UPDATE "users" SET email = 'demo@zentory.ch' WHERE email = 'demo@logistikapp.ch';
