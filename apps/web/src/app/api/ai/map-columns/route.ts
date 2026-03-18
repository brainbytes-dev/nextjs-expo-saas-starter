import { NextResponse } from "next/server"
import { getSession } from "@/app/api/_helpers/auth"
import {
  ruleBasedMapping,
  type AiMappingSuggestion,
} from "@/lib/ai-column-mapper"

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------
interface MapColumnsRequest {
  headers: string[]
  sampleRows: string[][]
  targetFields: { key: string; label: string }[]
}

// ---------------------------------------------------------------------------
// POST /api/ai/map-columns
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    // Auth guard (skipped only in demo mode — handled by middleware)
    const sessionResult = await getSession()
    if (sessionResult.error) return sessionResult.error

    const body: MapColumnsRequest = await request.json()
    const { headers, sampleRows, targetFields } = body

    if (!Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: "headers must be a non-empty array" },
        { status: 400 }
      )
    }
    if (!Array.isArray(targetFields) || targetFields.length === 0) {
      return NextResponse.json(
        { error: "targetFields must be a non-empty array" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Graceful fallback: return rule-based mappings as if they came from AI
      const fallback = ruleBasedMapping(headers, targetFields)
      return NextResponse.json({ mappings: fallback, source: "rule-based" })
    }

    // Limit sample data to first 5 rows, max 30 chars per cell to keep tokens low
    const truncatedSample = (sampleRows ?? []).slice(0, 5).map((row) =>
      row.map((cell) => String(cell ?? "").slice(0, 30))
    )

    const prompt = buildPrompt(headers, truncatedSample, targetFields)

    const { OpenAI } = await import("openai")
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a data mapping assistant. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Unexpected non-JSON from model — fall back
      const fallback = ruleBasedMapping(headers, targetFields)
      return NextResponse.json({ mappings: fallback, source: "rule-based" })
    }

    const mappings = extractMappings(parsed, headers, targetFields)
    return NextResponse.json({ mappings, source: "ai" })
  } catch (error) {
    console.error("POST /api/ai/map-columns error:", error)
    return NextResponse.json(
      { error: "AI column mapping failed" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPrompt(
  headers: string[],
  sampleRows: string[][],
  targetFields: { key: string; label: string }[]
): string {
  const fieldList = targetFields
    .filter((f) => f.key !== "_skip")
    .map((f) => `"${f.key}" (${f.label})`)
    .join(", ")

  const sampleText =
    sampleRows.length > 0
      ? sampleRows
          .map((row, i) => `  Row ${i + 1}: ${JSON.stringify(row)}`)
          .join("\n")
      : "  (no sample data)"

  return `Map these CSV column headers to the target fields.

CSV headers: ${JSON.stringify(headers)}

Target fields (key / label): ${fieldList}

Sample data (first ${sampleRows.length} rows, values in same order as headers):
${sampleText}

Return a JSON object with a single key "mappings" whose value is an array.
Each item: { "source": "<csv header>", "target": "<field key or null>", "confidence": <0.0-1.0> }
Use null as target when no field matches. Include every CSV header exactly once.`
}

function extractMappings(
  parsed: unknown,
  headers: string[],
  targetFields: { key: string; label: string }[]
): AiMappingSuggestion[] {
  const validKeys = new Set(targetFields.map((f) => f.key))

  // Accept both { mappings: [...] } and a direct array
  const raw =
    Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>)?.mappings

  if (!Array.isArray(raw)) {
    return ruleBasedMapping(headers, targetFields)
  }

  const seen = new Set<string>()
  const result: AiMappingSuggestion[] = []

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const { source, target, confidence } = item as Record<string, unknown>
    if (typeof source !== "string" || !headers.includes(source)) continue
    if (seen.has(source)) continue
    seen.add(source)

    const safeTarget =
      typeof target === "string" && validKeys.has(target) ? target : null
    const safeConfidence =
      typeof confidence === "number"
        ? Math.min(1, Math.max(0, confidence))
        : 0.5

    result.push({ source, target: safeTarget, confidence: safeConfidence })
  }

  // Ensure every header has an entry (fill gaps with rule-based)
  const ruleFallbacks = ruleBasedMapping(headers, targetFields)
  for (const fb of ruleFallbacks) {
    if (!seen.has(fb.source)) result.push(fb)
  }

  return result
}
