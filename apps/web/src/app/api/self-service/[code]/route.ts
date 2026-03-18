import { NextResponse } from "next/server"
import { getDb } from "@repo/db"
import {
  tools,
  materials,
  toolBookings,
} from "@repo/db/schema"
import { eq, or } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Rate-limit: simple in-memory store per Node process.
// For production at scale, swap for Upstash.
// ---------------------------------------------------------------------------
const _rateMap = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (_rateMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  )
  if (timestamps.length >= RATE_MAX) return true
  timestamps.push(now)
  _rateMap.set(ip, timestamps)
  return false
}

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------
async function findItem(code: string) {
  const db = getDb()

  const toolRow = await db
    .select({
      id: tools.id,
      name: tools.name,
      organizationId: tools.organizationId,
      isActive: tools.isActive,
    })
    .from(tools)
    .where(or(eq(tools.barcode, code), eq(tools.id, code)))
    .limit(1)

  if (toolRow.length > 0 && toolRow[0]!.isActive) {
    return { ...toolRow[0]!, itemType: "tool" as const }
  }

  const matRow = await db
    .select({
      id: materials.id,
      name: materials.name,
      organizationId: materials.organizationId,
      isActive: materials.isActive,
    })
    .from(materials)
    .where(or(eq(materials.barcode, code), eq(materials.id, code)))
    .limit(1)

  if (matRow.length > 0 && matRow[0]!.isActive) {
    return { ...matRow[0]!, itemType: "material" as const }
  }

  return null
}

// ---------------------------------------------------------------------------
// GET — lookup item info (public, no auth)
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 })
  }

  const item = await findItem(decodeURIComponent(code))
  if (!item) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return NextResponse.json({
    id: item.id,
    name: item.name,
    itemType: item.itemType,
  })
}

// ---------------------------------------------------------------------------
// POST — record a self-service action (no auth)
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const { action, name, code: employeeCode, notes } = body as Record<
    string,
    unknown
  >

  if (
    !action ||
    (action !== "checkout" && action !== "report") ||
    typeof name !== "string" ||
    !name.trim()
  ) {
    return NextResponse.json(
      { error: "Ungültige Parameter" },
      { status: 400 }
    )
  }

  const item = await findItem(decodeURIComponent(code))
  if (!item) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const db = getDb()

  if (item.itemType === "tool") {
    const noteText = [
      action === "checkout"
        ? `[Self-Service] Entnommen von: ${name.trim()}`
        : `[Problem-Meldung] Von: ${name.trim()}`,
      employeeCode ? `Code: ${employeeCode}` : null,
      notes ? `Notiz: ${notes}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    await db.insert(toolBookings).values({
      toolId: item.id,
      organizationId: item.organizationId,
      userId: null,
      fromLocationId: null,
      toLocationId: null,
      bookingType: action === "checkout" ? "checkout" : "report",
      notes: noteText,
    })
  }
  // Material reports: future enhancement — dedicated problem_reports table

  return NextResponse.json({ success: true })
}
