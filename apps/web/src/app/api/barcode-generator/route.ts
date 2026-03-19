import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { materials, tools } from "@repo/db/schema"
import { eq, and, isNull } from "drizzle-orm"

// ---------------------------------------------------------------------------
// GET /api/barcode-generator?type=material|tool
// Returns items without a barcode so the UI can list them for generation.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId } = result

  const url = new URL(request.url)
  const type = url.searchParams.get("type") ?? "material"

  if (type === "tool") {
    const rows = await db
      .select({ id: tools.id, name: tools.name, number: tools.number, barcode: tools.barcode })
      .from(tools)
      .where(and(eq(tools.organizationId, orgId), eq(tools.isActive, true), isNull(tools.barcode)))
      .orderBy(tools.name)
      .limit(200)
    return NextResponse.json(rows)
  }

  const rows = await db
    .select({ id: materials.id, name: materials.name, number: materials.number, barcode: materials.barcode })
    .from(materials)
    .where(and(eq(materials.organizationId, orgId), eq(materials.isActive, true), isNull(materials.barcode)))
    .orderBy(materials.name)
    .limit(200)
  return NextResponse.json(rows)
}

// ---------------------------------------------------------------------------
// POST /api/barcode-generator
// Body: { type: "material"|"tool", itemId: string, barcode: string }
// Saves the barcode to the DB record.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId } = result

  const body = (await request.json()) as { type?: string; itemId?: string; barcode?: string }
  const { type, itemId, barcode } = body

  if (!type || !itemId || !barcode) {
    return NextResponse.json({ error: "type, itemId und barcode sind erforderlich" }, { status: 400 })
  }

  if (barcode.length < 3 || barcode.length > 50) {
    return NextResponse.json({ error: "Barcode-Länge muss zwischen 3 und 50 Zeichen liegen" }, { status: 400 })
  }

  if (type === "tool") {
    const [updated] = await db
      .update(tools)
      .set({ barcode, updatedAt: new Date() })
      .where(and(eq(tools.id, itemId), eq(tools.organizationId, orgId)))
      .returning({ id: tools.id, barcode: tools.barcode })

    if (!updated) {
      return NextResponse.json({ error: "Werkzeug nicht gefunden" }, { status: 404 })
    }
    return NextResponse.json(updated)
  }

  const [updated] = await db
    .update(materials)
    .set({ barcode, updatedAt: new Date() })
    .where(and(eq(materials.id, itemId), eq(materials.organizationId, orgId)))
    .returning({ id: materials.id, barcode: materials.barcode })

  if (!updated) {
    return NextResponse.json({ error: "Material nicht gefunden" }, { status: 404 })
  }
  return NextResponse.json(updated)
}
