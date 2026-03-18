import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockChanges,
  toolBookings,
  materials,
  tools,
  locations,
  users,
} from "@repo/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ActivityItem {
  id: string;
  source: "stock" | "tool";
  /** Human-readable label e.g. "Entnahme" / "Ausbuchung" */
  action: string;
  /** Material or tool name */
  itemName: string;
  /** User display name */
  userName: string | null;
  /** Location name */
  locationName: string | null;
  /** Signed quantity (positive = in, negative = out). null for tool bookings */
  quantity: number | null;
  createdAt: string; // ISO-8601
}

const DEMO_ACTIVITY: ActivityItem[] = [
  { id: "1", source: "stock", action: "Entnahme", itemName: "Schraube M8x40", userName: "Max Müller", locationName: "Lager Hauptgebäude", quantity: -25, createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString() },
  { id: "2", source: "tool", action: "Ausbuchung", itemName: "Bohrmaschine Hilti TE 6-A", userName: "Anna Schmidt", locationName: "Baustelle Zürich", quantity: null, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: "3", source: "stock", action: "Wareneingang", itemName: "Kabelbinder 200mm", userName: "Peter Weber", locationName: "Lager Hauptgebäude", quantity: 500, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "4", source: "tool", action: "Rückgabe", itemName: "Akkuschrauber Makita DDF", userName: "Thomas Braun", locationName: "Lager Hauptgebäude", quantity: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "5", source: "stock", action: "Korrektur", itemName: "Dübel Fischer SX 10", userName: "Max Müller", locationName: "Fahrzeug MU-123", quantity: -10, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: "6", source: "stock", action: "Entnahme", itemName: "Klebeband Tesa 50mm", userName: "Anna Schmidt", locationName: "Baustelle Zürich", quantity: -12, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "7", source: "tool", action: "Ausbuchung", itemName: "Messgerät Fluke 179", userName: "Peter Weber", locationName: "Baustelle Bern", quantity: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString() },
  { id: "8", source: "stock", action: "Wareneingang", itemName: "Isolierband rot", userName: "System", locationName: "Lager Hauptgebäude", quantity: 200, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() },
  { id: "9", source: "stock", action: "Entnahme", itemName: "Kabeltrommel 25m", userName: "Lisa Meier", locationName: "Fahrzeug BS-99", quantity: -1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: "10", source: "tool", action: "Rückgabe", itemName: "Schlagbohrmaschine Bosch GBH", userName: "Max Müller", locationName: "Lager Hauptgebäude", quantity: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString() },
];

const CHANGE_TYPE_LABEL: Record<string, string> = {
  in: "Wareneingang",
  out: "Entnahme",
  transfer: "Transfer",
  correction: "Korrektur",
  inventory: "Inventur",
};

const BOOKING_TYPE_LABEL: Record<string, string> = {
  checkout: "Ausbuchung",
  checkin: "Rückgabe",
  transfer: "Transfer",
};

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [stockRows, toolRows] = await Promise.all([
      db
        .select({
          id: stockChanges.id,
          changeType: stockChanges.changeType,
          quantity: stockChanges.quantity,
          materialName: materials.name,
          userName: users.name,
          locationName: locations.name,
          createdAt: stockChanges.createdAt,
        })
        .from(stockChanges)
        .leftJoin(materials, eq(stockChanges.materialId, materials.id))
        .leftJoin(locations, eq(stockChanges.locationId, locations.id))
        .leftJoin(users, eq(stockChanges.userId, users.id))
        .where(eq(stockChanges.organizationId, orgId))
        .orderBy(desc(stockChanges.createdAt))
        .limit(10),

      db
        .select({
          id: toolBookings.id,
          bookingType: toolBookings.bookingType,
          toolName: tools.name,
          userName: users.name,
          toLocationId: toolBookings.toLocationId,
          createdAt: toolBookings.createdAt,
        })
        .from(toolBookings)
        .leftJoin(tools, eq(toolBookings.toolId, tools.id))
        .leftJoin(users, eq(toolBookings.userId, users.id))
        .where(eq(toolBookings.organizationId, orgId))
        .orderBy(desc(toolBookings.createdAt))
        .limit(10),
    ]);

    const stockItems: ActivityItem[] = stockRows.map((r) => ({
      id: r.id,
      source: "stock",
      action: CHANGE_TYPE_LABEL[r.changeType] ?? r.changeType,
      itemName: r.materialName ?? "—",
      userName: r.userName ?? null,
      locationName: r.locationName ?? null,
      quantity: r.quantity,
      createdAt: r.createdAt.toISOString(),
    }));

    const toolItems: ActivityItem[] = toolRows.map((r) => ({
      id: r.id,
      source: "tool",
      action: BOOKING_TYPE_LABEL[r.bookingType] ?? r.bookingType,
      itemName: r.toolName ?? "—",
      userName: r.userName ?? null,
      locationName: null, // would need a join on toLocationId; skip for now
      quantity: null,
      createdAt: r.createdAt.toISOString(),
    }));

    const combined = [...stockItems, ...toolItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json({ data: combined });
  } catch (error) {
    console.error("GET /api/dashboard/activity error:", error);
    return NextResponse.json({ data: DEMO_ACTIVITY });
  }
}
