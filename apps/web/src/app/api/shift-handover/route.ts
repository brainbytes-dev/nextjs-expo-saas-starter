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
  orders,
  suppliers,
} from "@repo/db/schema";

// ---------------------------------------------------------------------------
// GET /api/shift-handover
//
// Query params:
//   date  — ISO date string, e.g. "2026-03-20"  (default: today)
//   shift — "early" | "late" | "night"           (default: "early")
//
// Shift windows:
//   early  06:00–14:00
//   late   14:00–22:00
//   night  22:00–06:00 (next day)
// ---------------------------------------------------------------------------

function shiftBounds(
  dateStr: string,
  shift: string
): { start: Date; end: Date } {
  const base = new Date(dateStr);
  const start = new Date(base);
  const end = new Date(base);

  switch (shift) {
    case "late":
      start.setHours(14, 0, 0, 0);
      end.setHours(22, 0, 0, 0);
      break;
    case "night":
      start.setHours(22, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
      break;
    default: // early
      start.setHours(6, 0, 0, 0);
      end.setHours(14, 0, 0, 0);
      break;
  }

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
    const shift = url.searchParams.get("shift") ?? "early";

    const { start, end } = shiftBounds(dateParam, shift);

    // ── Stock changes during shift ──────────────────────────────────────
    const stockRows = await db
      .select({
        id: stockChanges.id,
        changeType: stockChanges.changeType,
        quantity: stockChanges.quantity,
        notes: stockChanges.notes,
        createdAt: stockChanges.createdAt,
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

    // ── Tool bookings during shift ──────────────────────────────────────
    const toolRows = await db
      .select({
        id: toolBookings.id,
        bookingType: toolBookings.bookingType,
        notes: toolBookings.notes,
        createdAt: toolBookings.createdAt,
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

    // ── Open commissions (status = open or in_progress) ─────────────────
    const openCommissions = await db
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
          inArray(commissions.status, ["open", "in_progress"])
        )
      )
      .orderBy(commissions.updatedAt)
      .limit(200);

    // ── Open orders (status = ordered) ──────────────────────────────────
    const openOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        ownOrderNumber: orders.ownOrderNumber,
        status: orders.status,
        orderDate: orders.orderDate,
        totalAmount: orders.totalAmount,
        currency: orders.currency,
        supplierName: suppliers.name,
        notes: orders.notes,
      })
      .from(orders)
      .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .where(
        and(
          eq(orders.organizationId, orgId),
          eq(orders.status, "ordered")
        )
      )
      .orderBy(orders.orderDate)
      .limit(200);

    // ── Summary counts ──────────────────────────────────────────────────
    const inCount = stockRows.filter((r) => r.changeType === "in").length;
    const outCount = stockRows.filter((r) => r.changeType === "out").length;
    const transferCount = stockRows.filter(
      (r) => r.changeType === "transfer"
    ).length;
    const correctionCount = stockRows.filter(
      (r) => r.changeType === "correction" || r.changeType === "inventory"
    ).length;
    const checkoutCount = toolRows.filter(
      (r) => r.bookingType === "checkout"
    ).length;
    const checkinCount = toolRows.filter(
      (r) => r.bookingType === "checkin"
    ).length;

    return NextResponse.json({
      date: dateParam,
      shift,
      shiftStart: start.toISOString(),
      shiftEnd: end.toISOString(),
      summary: {
        totalStockChanges: stockRows.length,
        inCount,
        outCount,
        transferCount,
        correctionCount,
        checkoutCount,
        checkinCount,
        openCommissions: openCommissions.length,
        openOrders: openOrders.length,
      },
      stockChanges: stockRows,
      toolBookings: toolRows,
      openCommissions,
      openOrders,
    });
  } catch (error) {
    console.error("GET /api/shift-handover error:", error);
    return NextResponse.json(
      { error: "Schichtübergabe-Daten konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
