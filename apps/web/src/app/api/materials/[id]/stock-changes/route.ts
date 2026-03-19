/**
 * POST /api/materials/[id]/stock-changes
 *
 * Convenience alias for POST /api/materials/[id]/stock
 * Used by the material detail page booking dialog.
 * Returns the created stock change record (needed for photo upload).
 */
export { POST } from "../stock/route";
