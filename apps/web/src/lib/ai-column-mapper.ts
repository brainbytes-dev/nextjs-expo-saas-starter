// ---------------------------------------------------------------------------
// AI Column Mapper
// Client-callable library that calls /api/ai/map-columns and falls back to
// the rule-based detectField logic when AI is unavailable.
// ---------------------------------------------------------------------------

export interface ColumnMapping {
  source: string       // CSV column header
  target: string | null  // target field key, or null to skip
  confidence: number   // 0-1
  aiSuggested: boolean
}

export interface AiMappingSuggestion {
  source: string
  target: string | null
  confidence: number
}

// ---------------------------------------------------------------------------
// Main entry-point (called from client components)
// ---------------------------------------------------------------------------
export async function suggestMappings(
  headers: string[],
  sampleRows: string[][],
  targetFields: { key: string; label: string }[]
): Promise<ColumnMapping[]> {
  // 1. Try AI endpoint
  try {
    const res = await fetch("/api/ai/map-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers, sampleRows, targetFields }),
    })

    if (res.ok) {
      const data: { mappings: AiMappingSuggestion[]; source: string } =
        await res.json()

      const isAi = data.source === "ai"

      // 2. Merge: AI suggestions win over rule-based when confidence > 0.7
      const ruleMaps = ruleBasedMapping(headers, targetFields)
      const ruleBySource = new Map(ruleMaps.map((m) => [m.source, m]))

      return headers.map((header) => {
        const ai = data.mappings.find((m) => m.source === header)
        const rule = ruleBySource.get(header)

        if (ai && isAi && ai.confidence > 0.7) {
          return {
            source: header,
            target: ai.target,
            confidence: ai.confidence,
            aiSuggested: true,
          }
        }

        // Prefer rule-based with auto-confidence over low-confidence AI
        if (rule && rule.target !== null) {
          return {
            source: header,
            target: rule.target,
            confidence: 0.85, // rule-based is deterministic — show as high
            aiSuggested: false,
          }
        }

        // Low-confidence AI suggestion
        if (ai) {
          return {
            source: header,
            target: ai.target,
            confidence: ai.confidence,
            aiSuggested: isAi,
          }
        }

        return { source: header, target: null, confidence: 0, aiSuggested: false }
      })
    }
  } catch {
    // Network error — fall through to rule-based
  }

  // 3. Pure rule-based fallback
  return ruleBasedMapping(headers, targetFields).map((m) => ({
    ...m,
    aiSuggested: false,
  }))
}

// ---------------------------------------------------------------------------
// Rule-based mapper (re-exported so the API route can also use it)
// Mirrors the detectField logic from both import pages.
// ---------------------------------------------------------------------------
export function ruleBasedMapping(
  headers: string[],
  targetFields: { key: string; label: string }[]
): AiMappingSuggestion[] {
  const validKeys = new Set(targetFields.map((f) => f.key))

  return headers.map((header) => {
    const { field } = detectFieldGeneric(header, validKeys)
    return {
      source: header,
      target: field === "_skip" ? null : field,
      confidence: field === "_skip" ? 0 : 0.85,
    }
  })
}

// ---------------------------------------------------------------------------
// Generic detectField — supports both material and tool field sets.
// Unknown fields map to "_skip" (returned as null by the caller).
// ---------------------------------------------------------------------------
function detectFieldGeneric(
  header: string,
  validKeys: Set<string>
): { field: string } {
  const h = header.toLowerCase().replace(/[\s_\-]/g, "")

  // Name / Bezeichnung
  if (
    (h.includes("name") ||
      h.includes("bezeichnung") ||
      h.includes("beschreibung") ||
      (h.includes("artikel") && h.includes("bez"))) &&
    validKeys.has("name")
  )
    return { field: "name" }

  // Barcode / EAN (materials only)
  if (
    (h === "ean" ||
      h === "ean13" ||
      h === "ean8" ||
      h.includes("strichcode") ||
      h.includes("barcode") ||
      h.includes("qrcode") ||
      h.includes("code")) &&
    validKeys.has("barcode")
  )
    return { field: "barcode" }

  // Einheit (materials only)
  if (
    (h.includes("einheit") || h === "unit" || h === "me" || h === "masseinheit") &&
    validKeys.has("unit")
  )
    return { field: "unit" }

  // Artikelnummer / number
  if (
    ((h.includes("artikel") && h.includes("nr")) ||
      h.includes("artikelnummer") ||
      h === "nr" ||
      h === "number" ||
      h.includes("artnr") ||
      h.includes("nummer")) &&
    validKeys.has("number")
  )
    return { field: "number" }

  // Meldebestand (materials only)
  if (
    (h.includes("melde") ||
      h.includes("reorder") ||
      h.includes("minbestand") ||
      h.includes("mindestbestand")) &&
    validKeys.has("reorderLevel")
  )
    return { field: "reorderLevel" }

  // Herstellernummer (materials only)
  if (
    (h.includes("herstellernummer") ||
      h.includes("manufacturernumber") ||
      h.includes("artnrhersteller") ||
      h.includes("herstellerart")) &&
    validKeys.has("manufacturerNumber")
  )
    return { field: "manufacturerNumber" }

  // Hersteller / manufacturer (both)
  if (
    (h.includes("hersteller") ||
      h.includes("manufacturer") ||
      h.includes("brand") ||
      h.includes("marke")) &&
    validKeys.has("manufacturer")
  )
    return { field: "manufacturer" }

  // Seriennummer (tools only)
  if (
    (h.includes("seriennummer") || h.includes("serial") || h.includes("sn")) &&
    validKeys.has("serialNumber")
  )
    return { field: "serialNumber" }

  // Zustand (tools only)
  if (
    (h.includes("zustand") || h.includes("condition") || h.includes("status")) &&
    validKeys.has("condition")
  )
    return { field: "condition" }

  // Notizen / notes (both)
  if (
    (h.includes("notiz") ||
      h.includes("note") ||
      h.includes("bemerk") ||
      h.includes("komment") ||
      h.includes("info")) &&
    validKeys.has("notes")
  )
    return { field: "notes" }

  return { field: "_skip" }
}
