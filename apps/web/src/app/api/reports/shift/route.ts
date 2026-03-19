import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockChanges,
  materials,
  locations,
  users,
  toolBookings,
  tools,
  commissions,
} from "@repo/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/reports/shift
//
// Query params:
//   date  — ISO date string, e.g. "2026-03-19"  (default: today)
//
// Returns a structured shift report covering:
//   - stockChanges grouped by user
//   - toolBookings grouped by user
//   - commissions created/updated on the day
//   - summary counts
// ---------------------------------------------------------------------------

function dayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const dateParam =
      url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    const { start, end } = dayBounds(dateParam);

    // ── Stock changes for the day ──────────────────────────────────────────
    const stockRows = await db
      .select({
        id: stockChanges.id,
        changeType: stockChanges.changeType,
        quantity: stockChanges.quantity,
        notes: stockChanges.notes,
        createdAt: stockChanges.createdAt,
        materialId: stockChanges.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        locationName: locations.name,
        userId: stockChanges.userId,
        userName: users.name,
      })
      .from(stockChanges)
      .leftJoin(materials, eq(stockChanges.materialId, materials.id))
      .leftJoin(locations, eq(stockChanges.locationId, locations.id))
      .leftJoin(users, eq(stockChanges.userId, users.id))
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, start),
          lte(stockChanges.createdAt, end)
        )
      )
      .orderBy(stockChanges.createdAt)
      .limit(2000);

    // ── Tool bookings for the day ─────────────────────────────────────────
    const toolRows = await db
      .select({
        id: toolBookings.id,
        bookingType: toolBookings.bookingType,
        notes: toolBookings.notes,
        createdAt: toolBookings.createdAt,
        toolId: toolBookings.toolId,
        toolName: tools.name,
        toolNumber: tools.number,
        userId: toolBookings.userId,
        userName: users.name,
      })
      .from(toolBookings)
      .leftJoin(tools, eq(toolBookings.toolId, tools.id))
      .leftJoin(users, eq(toolBookings.userId, users.id))
      .where(
        and(
          eq(toolBookings.organizationId, orgId),
          gte(toolBookings.createdAt, start),
          lte(toolBookings.createdAt, end)
        )
      )
      .orderBy(toolBookings.createdAt)
      .limit(1000);

    // ── Commissions created or updated today ──────────────────────────────
    const commissionRows = await db
      .select({
        id: commissions.id,
        name: commissions.name,
        number: commissions.number,
        manualNumber: commissions.manualNumber,
        status: commissions.status,
        createdAt: commissions.createdAt,
        updatedAt: commissions.updatedAt,
      })
      .from(commissions)
      .where(
        and(
          eq(commissions.organizationId, orgId),
          gte(commissions.updatedAt, start),
          lte(commissions.updatedAt, end)
        )
      )
      .orderBy(commissions.updatedAt)
      .limit(500);

    // ── Summary stats ─────────────────────────────────────────────────────
    const [stockCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, start),
          lte(stockChanges.createdAt, end)
        )
      );

    const totalStockChanges = Number(stockCountResult?.count ?? 0);

    const inCount = stockRows.filter((r) => r.changeType === "in").length;
    const outCount = stockRows.filter((r) => r.changeType === "out").length;
    const transferCount = stockRows.filter((r) => r.changeType === "transfer").length;
    const correctionCount = stockRows.filter(
      (r) => r.changeType === "correction" || r.changeType === "inventory"
    ).length;

    const checkoutCount = toolRows.filter((r) => r.bookingType === "checkout").length;
    const checkinCount = toolRows.filter((r) => r.bookingType === "checkin").length;

    // ── Group stock changes by user ────────────────────────────────────────
    const stockByUser = new Map<
      string,
      { userName: string; userId: string; changes: typeof stockRows }
    >();
    for (const row of stockRows) {
      const key = row.userId ?? "unknown";
      const existing = stockByUser.get(key);
      if (existing) {
        existing.changes.push(row);
      } else {
        stockByUser.set(key, {
          userId: row.userId ?? "unknown",
          userName: row.userName ?? "Unbekannt",
          changes: [row],
        });
      }
    }

    // ── Group tool bookings by user ────────────────────────────────────────
    const toolsByUser = new Map<
      string,
      { userName: string; userId: string; bookings: typeof toolRows }
    >();
    for (const row of toolRows) {
      const key = row.userId ?? "unknown";
      const existing = toolsByUser.get(key);
      if (existing) {
        existing.bookings.push(row);
      } else {
        toolsByUser.set(key, {
          userId: row.userId ?? "unknown",
          userName: row.userName ?? "Unbekannt",
          bookings: [row],
        });
      }
    }

    return NextResponse.json({
      date: dateParam,
      summary: {
        totalStockChanges,
        inCount,
        outCount,
        transferCount,
        correctionCount,
        checkoutCount,
        checkinCount,
        commissionsUpdated: commissionRows.length,
      },
      stockChangesByUser: [...stockByUser.values()],
      toolBookingsByUser: [...toolsByUser.values()],
      commissions: commissionRows,
    });
  } catch (error) {
    console.error("GET /api/reports/shift error:", error);
    return NextResponse.json(
      { error: "Failed to generate shift report" },
      { status: 500 }
    );
  }
}
