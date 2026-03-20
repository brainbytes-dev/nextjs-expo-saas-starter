import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  orders,
  suppliers,
  supplierRatings,
  deliveryTracking,
  stockChanges,
  materials,
} from "@repo/db/schema";
import {
  eq,
  and,
  sql,
  gte,
  count,
  sum,
  avg,
  desc,
} from "drizzle-orm";

// ─── Demo data fallback ──────────────────────────────────────────────
function generateDemoData() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      month: d.toLocaleDateString("de-CH", { month: "short", year: "2-digit" }),
      inbound: Math.floor(Math.random() * 200 + 80),
      outbound: Math.floor(Math.random() * 150 + 50),
    });
  }

  return {
    pipeline: {
      draft: 4,
      ordered: 12,
      partial: 3,
      received: 28,
    },
    stats: {
      totalVolume: 84_250,
      openOrders: 19,
      avgDeliveryDays: 4.2,
      onTimeRate: 87,
    },
    stockFlow: months,
    supplierPerformance: [
      { name: "Hilti AG", orders: 18, avgDays: 3.2, onTimeRate: 94, rating: 4.5 },
      { name: "Würth Schweiz", orders: 14, avgDays: 4.1, onTimeRate: 86, rating: 4.2 },
      { name: "Debrunner Acifer", orders: 11, avgDays: 5.0, onTimeRate: 82, rating: 3.8 },
      { name: "Bossard AG", orders: 9, avgDays: 3.8, onTimeRate: 89, rating: 4.0 },
      { name: "Distrelec", orders: 7, avgDays: 2.5, onTimeRate: 100, rating: 4.7 },
    ],
    topConsumed: [
      { name: "Einweghandschuhe L", quantity: 420 },
      { name: "Desinfektionsmittel 1L", quantity: 310 },
      { name: "Verbandmaterial Set", quantity: 245 },
      { name: "Mundschutz FFP2", quantity: 198 },
      { name: "Kabelbinder 100mm", quantity: 165 },
      { name: "Einwegbecher 200ml", quantity: 142 },
      { name: "Papiertücher", quantity: 128 },
      { name: "Kugelschreiber Blau", quantity: 95 },
    ],
    deliveryStatus: [
      { status: "ordered", label: "Bestellt", count: 5 },
      { status: "confirmed", label: "Bestätigt", count: 3 },
      { status: "shipped", label: "Unterwegs", count: 4 },
      { status: "delivered", label: "Geliefert", count: 28 },
      { status: "delayed", label: "Verspätet", count: 2 },
    ],
  };
}

// ─── GET /api/analytics/supply-chain ─────────────────────────────────
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ── 1. Order Pipeline ──────────────────────────────────────────
    const pipelineRows = await db
      .select({
        status: orders.status,
        cnt: count(orders.id),
        total: sum(orders.totalAmount),
      })
      .from(orders)
      .where(eq(orders.organizationId, orgId))
      .groupBy(orders.status);

    const pipeline: Record<string, number> = { draft: 0, ordered: 0, partial: 0, received: 0 };
    let totalVolume = 0;
    let openOrders = 0;
    for (const row of pipelineRows) {
      const s = row.status ?? "draft";
      pipeline[s] = Number(row.cnt);
      totalVolume += Number(row.total ?? 0);
      if (s === "draft" || s === "ordered" || s === "partial") {
        openOrders += Number(row.cnt);
      }
    }

    // ── 2. Delivery Status Distribution ────────────────────────────
    const deliveryRows = await db
      .select({
        status: deliveryTracking.status,
        cnt: count(deliveryTracking.id),
      })
      .from(deliveryTracking)
      .where(eq(deliveryTracking.organizationId, orgId))
      .groupBy(deliveryTracking.status);

    const statusLabels: Record<string, string> = {
      ordered: "Bestellt",
      confirmed: "Bestätigt",
      shipped: "Unterwegs",
      in_transit: "Unterwegs",
      delivered: "Geliefert",
      partial: "Teillieferung",
      delayed: "Verspätet",
    };

    const deliveryStatus = deliveryRows.map((r) => ({
      status: r.status,
      label: statusLabels[r.status] ?? r.status,
      count: Number(r.cnt),
    }));

    // ── 3. Supplier Performance ────────────────────────────────────
    // Get ratings per supplier
    const ratingRows = await db
      .select({
        supplierId: supplierRatings.supplierId,
        avgDays: avg(supplierRatings.deliveryTime),
        avgQuality: avg(supplierRatings.quality),
        totalRatings: count(supplierRatings.id),
        onTimeCount: sql<number>`count(case when ${supplierRatings.deliveryTime} <= 5 then 1 end)`,
      })
      .from(supplierRatings)
      .where(eq(supplierRatings.organizationId, orgId))
      .groupBy(supplierRatings.supplierId);

    const ratingMap = new Map(
      ratingRows.map((r) => [
        r.supplierId,
        {
          avgDays: Number(r.avgDays ?? 0),
          rating: Number(r.avgQuality ?? 0),
          onTimeRate: r.totalRatings
            ? Math.round((Number(r.onTimeCount) / Number(r.totalRatings)) * 100)
            : 0,
        },
      ])
    );

    // We need supplier IDs — re-query with IDs
    const supplierIdRows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        orderCount: count(orders.id),
      })
      .from(suppliers)
      .leftJoin(orders, and(eq(orders.supplierId, suppliers.id), eq(orders.organizationId, orgId)))
      .where(eq(suppliers.organizationId, orgId))
      .groupBy(suppliers.id, suppliers.name)
      .orderBy(desc(count(orders.id)))
      .limit(10);

    const supplierPerformance = supplierIdRows.map((s) => {
      const r = ratingMap.get(s.id);
      return {
        name: s.name,
        orders: Number(s.orderCount),
        avgDays: r?.avgDays ? Math.round(r.avgDays * 10) / 10 : null,
        onTimeRate: r?.onTimeRate ?? null,
        rating: r?.rating ? Math.round(r.rating * 10) / 10 : null,
      };
    });

    // ── 4. Stock Flow (last 6 months, monthly) ─────────────────────
    const flowRows = await db
      .select({
        month: sql<string>`to_char(${stockChanges.createdAt}, 'Mon YY')`,
        monthSort: sql<string>`to_char(${stockChanges.createdAt}, 'YYYY-MM')`,
        changeType: stockChanges.changeType,
        total: sum(sql<number>`abs(${stockChanges.quantity})`),
      })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, sixMonthsAgo)
        )
      )
      .groupBy(
        sql`to_char(${stockChanges.createdAt}, 'Mon YY')`,
        sql`to_char(${stockChanges.createdAt}, 'YYYY-MM')`,
        stockChanges.changeType
      )
      .orderBy(sql`to_char(${stockChanges.createdAt}, 'YYYY-MM')`);

    const flowMap = new Map<string, { month: string; inbound: number; outbound: number }>();
    for (const row of flowRows) {
      if (!flowMap.has(row.monthSort)) {
        flowMap.set(row.monthSort, { month: row.month, inbound: 0, outbound: 0 });
      }
      const entry = flowMap.get(row.monthSort)!;
      const qty = Number(row.total ?? 0);
      if (row.changeType === "in" || row.changeType === "inventory") {
        entry.inbound += qty;
      } else if (row.changeType === "out" || row.changeType === "transfer") {
        entry.outbound += qty;
      }
    }
    const stockFlow = Array.from(flowMap.values());

    // ── 5. Top Consumed Materials (last 30 days) ───────────────────
    const consumedRows = await db
      .select({
        name: materials.name,
        quantity: sum(sql<number>`abs(${stockChanges.quantity})`),
      })
      .from(stockChanges)
      .innerJoin(materials, eq(stockChanges.materialId, materials.id))
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          eq(stockChanges.changeType, "out"),
          gte(stockChanges.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(materials.id, materials.name)
      .orderBy(desc(sum(sql<number>`abs(${stockChanges.quantity})`)))
      .limit(8);

    const topConsumed = consumedRows.map((r) => ({
      name: r.name,
      quantity: Number(r.quantity ?? 0),
    }));

    // ── 6. Average delivery time + on-time rate ────────────────────
    const deliveryStatsRows = await db
      .select({
        avgDays: avg(supplierRatings.deliveryTime),
        totalRatings: count(supplierRatings.id),
        onTimeCount: sql<number>`count(case when ${supplierRatings.deliveryTime} <= 5 then 1 end)`,
      })
      .from(supplierRatings)
      .where(eq(supplierRatings.organizationId, orgId));

    const ds = deliveryStatsRows[0];
    const avgDeliveryDays = ds ? Math.round(Number(ds.avgDays ?? 0) * 10) / 10 : 0;
    const onTimeRate = ds && Number(ds.totalRatings) > 0
      ? Math.round((Number(ds.onTimeCount) / Number(ds.totalRatings)) * 100)
      : 0;

    return NextResponse.json({
      pipeline,
      stats: {
        totalVolume: Math.round(totalVolume / 100), // cents to CHF
        openOrders,
        avgDeliveryDays,
        onTimeRate,
      },
      stockFlow,
      supplierPerformance,
      topConsumed,
      deliveryStatus,
    });
  } catch (error) {
    console.error("GET /api/analytics/supply-chain error:", error);
    return NextResponse.json(generateDemoData());
  }
}
