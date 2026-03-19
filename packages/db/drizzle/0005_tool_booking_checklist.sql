-- Migration: Add checklist_result column to tool_bookings
-- Stores the completed checklist items (id, label, required, checked, notes?) as JSONB

ALTER TABLE "tool_bookings" ADD COLUMN IF NOT EXISTS "checklist_result" jsonb;
