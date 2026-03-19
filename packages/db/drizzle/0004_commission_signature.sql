-- Migration: Add digital signature fields to commissions table
-- These columns store the base64 PNG data URL from the SignatureCanvas component,
-- the timestamp when the signature was captured, and the name of the signer.

ALTER TABLE "commissions"
  ADD COLUMN IF NOT EXISTS "signature"  text,
  ADD COLUMN IF NOT EXISTS "signed_at"  timestamp,
  ADD COLUMN IF NOT EXISTS "signed_by"  text;
