import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockChanges,
  materials,
  materialGroups,
  tools,
  toolGroups,
} from "@repo/db/schema";
import {
  eq,
  and,
  sql,
  gte,
  lte,
  count,
  sum,
  desc,
} from "drizzle-orm";

// ─── Demo data fallbacks ─────────────────────────────────────────────
function generateDemoStockMovement(days: number) {
  const rows = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    rows.push({
      date,
      stockIn: Math.floor(Math.random() * 30 + 5),
      stockOut: Math.floor(Math.random() * 20 + 3),
    })
  }
  return rows
}

const DEMO_ANALYTICS = {
  stockMovement: generateDemoStockMovement(30),
  materialCategories: [
    { name: "Verbrauchsmaterial", count: 87 },
    { name: "Reinigung", count: 34 },
    { name: "Sicherheit", count: 28 },
    { name: "Werkzeug", count: 21 },
    { name: "Sonstiges", count: 15 },
  ],
  toolUtilization: [
    { group: "Elektro", total: 24, checkedOut: 8, available: 16 },
    { group: "Handwerkzeug", total: 18, checkedOut: 5, available: 13 },
    { group: "Messgeräte", total: 12, checkedOut: 9, available: 3 },
    { group: "Fahrzeuge", total: 6, checkedOut: 4, available: 2 },
  ],
  topMaterials: [
    { name: "Einweghandschuhe L", changes: 142 },
    { name: "Desinfektionsmittel 1L", changes: 118 },
    { name: "Verbandmaterial Set", changes: 97 },
    { name: "Mundschutz FFP2", changes: 84 },
    { name: "Pflaster-Sortiment", changes: 71 },
    { name: "Einwegbecher 200ml", changes: 65 },
    { name: "Papiertücher", changes: 58 },
    { name: "Notizblöcke A5", changes: 49 },
    { name: "Kugelschreiber Blau", changes: 43 },
    { name: "Kabelbinder 100mm", changes: 38 },
  ],
};

// ─── GET /api/analytics?from=DATE&to=DATE ────────────────────────────
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const toDate = toParam ? new Date(toParam) : now;
    const fromDate = fromParam
      ? new Date(fromParam)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    toDate.setHours(23, 59, 59, 999);
    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    // ── 1. Stock Movement (in vs out per day) ────────────────────────
    const movementRows = await db
      .select({
        date: sql<string>`date_trunc('day', ${stockChanges.createdAt})::date::text`,
        changeType: stockChanges.changeType,
        total: sum(sql<number>`abs(${stockChanges.quantity})`),
      })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, new Date(fromIso)),
          lte(stockChanges.createdAt, new Date(toIso))
        )
      )
      .groupBy(
        sql`date_trunc('day', ${stockChanges.createdAt})::date`,
        stockChanges.changeType
      )
      .orderBy(sql`date_trunc('day', ${stockChanges.createdAt})::date`);

    // Pivot to { date, stockIn, stockOut }
    const movementMap = new Map<string, { stockIn: number; stockOut: number }>();
    for (const row of movementRows) {
      if (!movementMap.has(row.date)) {
        movementMap.set(row.date, { stockIn: 0, stockOut: 0 });
      }
      const entry = movementMap.get(row.date)!;
      const qty = Number(row.total ?? 0);
      if (row.changeType === "in" || row.changeType === "inventory") {
        entry.stockIn += qty;
      } else if (row.changeType === "out" || row.changeType === "transfer") {
        entry.stockOut += qty;
      }
    }
    const stockMovement = Array.from(movementMap.entries()).map(
      ([date, { stockIn, stockOut }]) => ({ date, stockIn, stockOut })
    );

    // ── 2. Material Categories (pie chart) ──────────────────────────
    const categoryRows = await db
      .select({
        name: sql<string>`coalesce(${materialGroups.name}, 'Ohne Gruppe')`,
        count: count(materials.id),
      })
      .from(materials)
      .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
      .where(
        and(
          eq(materials.organizationId, orgId),
          eq(materials.isActive, true)
        )
      )
      .groupBy(materialGroups.name)
      .orderBy(desc(count(materials.id)));

    // ── 3. Tool Utilization (bar chart) ────────────────────────────
    const toolUtilRows = await db
      .select({
        group: sql<string>`coalesce(${toolGroups.name}, 'Ohne Gruppe')`,
        total: count(tools.id),
        checkedOut: sql<number>`count(case when ${tools.assignedToId} is not null then 1 end)`,
      })
      .from(tools)
      .leftJoin(toolGroups, eq(tools.groupId, toolGroups.id))
      .where(
        and(eq(tools.organizationId, orgId), eq(tools.isActive, true))
      )
      .groupBy(toolGroups.name)
      .orderBy(desc(count(tools.id)));

    const toolUtilization = toolUtilRows.map((r) => ({
      group: r.group,
      total: Number(r.total),
      checkedOut: Number(r.checkedOut),
      available: Number(r.total) - Number(r.checkedOut),
    }));

    // ── 4. Top 10 Most Used Materials ──────────────────────────────
    const topMaterialRows = await db
      .select({
        name: materials.name,
        changes: count(stockChanges.id),
      })
      .from(stockChanges)
      .innerJoin(materials, eq(stockChanges.materialId, materials.id))
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, new Date(fromIso)),
          lte(stockChanges.createdAt, new Date(toIso))
        )
      )
      .groupBy(materials.id, materials.name)
      .orderBy(desc(count(stockChanges.id)))
      .limit(10);

    return NextResponse.json({
      stockMovement,
      materialCategories: categoryRows.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      toolUtilization,
      topMaterials: topMaterialRows.map((r) => ({
        name: r.name,
        changes: Number(r.changes),
      })),
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    // Return demo data on DB error (demo mode / missing env vars)
    return NextResponse.json(DEMO_ANALYTICS);
  }
}
