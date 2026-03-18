import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { stockChanges, materials, materialStocks } from "@repo/db/schema"
import { eq, and, gte, lt, desc, sql } from "drizzle-orm"
import {
  forecastDemand,
  suggestReorder,
  type DailyQuantity,
} from "@/lib/forecasting"

// ---------------------------------------------------------------------------
// GET /api/materials/[id]/forecast?days=30
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request)
    if (result.error) return result.error
    const { db, orgId } = result

    const { id: materialId } = await params

    const url = new URL(request.url)
    const daysAhead = Math.max(7, Math.min(90, parseInt(url.searchParams.get("days") ?? "30")))
    const leadTimeDays = Math.max(1, parseInt(url.searchParams.get("leadTime") ?? "7"))

    // ── 1. Verify material belongs to this org ──────────────────────
    const [material] = await db
      .select({
        id: materials.id,
        name: materials.name,
        unit: materials.unit,
        reorderLevel: materials.reorderLevel,
      })
      .from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.organizationId, orgId)))
      .limit(1)

    if (!material) {
      return NextResponse.json({ error: "Material nicht gefunden" }, { status: 404 })
    }

    // ── 2. Fetch last 90 days of stock changes ──────────────────────
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceStr = since.toISOString()

    const rows = await db
      .select({
        createdAt: stockChanges.createdAt,
        quantity: stockChanges.quantity,
        changeType: stockChanges.changeType,
      })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.materialId, materialId),
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, since)
        )
      )
      .orderBy(stockChanges.createdAt)
      .limit(2000)

    // ── 3. Group by day — sum absolute outbound as daily consumption ─
    const dayMap = new Map<string, number>()

    for (const row of rows) {
      const day = new Date(row.createdAt).toISOString().slice(0, 10)
      const qty = Number(row.quantity)

      // Outbound (negative qty or changeType "out") = consumption
      const consumed = row.changeType === "out" || qty < 0 ? Math.abs(qty) : 0
      dayMap.set(day, (dayMap.get(day) ?? 0) + consumed)
    }

    // Build sorted daily series (last 90 calendar days, gaps → 0)
    const history: DailyQuantity[] = []
    const cursor = new Date(since)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10)
      history.push({ date: key, quantity: dayMap.get(key) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    // ── 4. Get current stock ────────────────────────────────────────
    const stockRows = await db
      .select({ quantity: sql<number>`COALESCE(SUM(${materialStocks.quantity}), 0)` })
      .from(materialStocks)
      .where(eq(materialStocks.materialId, materialId))

    const currentStock = Number(stockRows[0]?.quantity ?? 0)

    // ── 5. Run forecasting engine ───────────────────────────────────
    const forecast = forecastDemand(history, daysAhead)
    const reorder = suggestReorder(history, currentStock, leadTimeDays)

    // ── 6. Compute meta stats ───────────────────────────────────────
    const activeHistory = history.filter((d) => d.quantity > 0)
    const avgDailyConsumption =
      activeHistory.length > 0
        ? activeHistory.reduce((s, d) => s + d.quantity, 0) / activeHistory.length
        : 0

    // Days with data coverage
    const dataPointCount = activeHistory.length

    return NextResponse.json({
      materialId,
      materialName: material.name,
      unit: material.unit ?? "Stk",
      reorderLevel: material.reorderLevel ?? 0,
      currentStock,
      leadTimeDays,
      avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
      dataPointCount,
      history: history.slice(-30), // send last 30 days for chart
      forecast,
      reorder,
    })
  } catch (error) {
    console.error("GET /api/materials/[id]/forecast error:", error)
    return NextResponse.json(
      { error: "Prognose konnte nicht berechnet werden" },
      { status: 500 }
    )
  }
}
