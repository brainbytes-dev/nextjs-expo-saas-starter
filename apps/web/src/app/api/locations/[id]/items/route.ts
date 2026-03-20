import { NextResponse } from "next/server"
import { getDb } from "@repo/db"
import {
  locations,
  materialStocks,
  materials,
  tools,
} from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * GET /api/locations/[id]/items
 * Public endpoint (no auth) — returns limited info about materials + tools
 * at a specific location. Rate-limited via middleware.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    // Fetch location (must be active)
    const [location] = await db
      .select({
        id: locations.id,
        name: locations.name,
        type: locations.type,
        category: locations.category,
        address: locations.address,
      })
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.isActive, true)))
      .limit(1)

    if (!location) {
      return NextResponse.json(
        { error: "Standort nicht gefunden" },
        { status: 404 }
      )
    }

    // Fetch materials at this location (limited info — no prices/notes)
    const stockRows = await db
      .select({
        materialId: materialStocks.materialId,
        quantity: materialStocks.quantity,
        materialName: materials.name,
        materialNumber: materials.number,
        unit: materials.unit,
      })
      .from(materialStocks)
      .innerJoin(materials, eq(materials.id, materialStocks.materialId))
      .where(eq(materialStocks.locationId, id))

    // Fetch tools at this location (limited info — no notes/assignee)
    const toolRows = await db
      .select({
        id: tools.id,
        name: tools.name,
        number: tools.number,
        condition: tools.condition,
      })
      .from(tools)
      .where(
        and(
          eq(tools.assignedLocationId, id),
          eq(tools.isActive, true)
        )
      )

    return NextResponse.json({
      location,
      materials: stockRows.map((r) => ({
        name: r.materialName,
        number: r.materialNumber,
        quantity: r.quantity,
        unit: r.unit,
      })),
      tools: toolRows.map((t) => ({
        name: t.name,
        number: t.number,
        condition: t.condition,
      })),
    })
  } catch (error) {
    console.error("GET /api/locations/[id]/items error:", error)
    return NextResponse.json(
      { error: "Fehler beim Laden der Standort-Daten" },
      { status: 500 }
    )
  }
}
