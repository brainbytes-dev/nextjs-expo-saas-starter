import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  inventoryCounts,
  inventoryCountItems,
  materialStocks,
  locations,
} from "@repo/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/inventory-counts?status=draft|in_progress|completed|cancelled
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const conditions = [eq(inventoryCounts.organizationId, orgId)];
    if (status) {
      conditions.push(eq(inventoryCounts.status, status));
    }

    const rows = await db
      .select({
        id: inventoryCounts.id,
        name: inventoryCounts.name,
        status: inventoryCounts.status,
        locationId: inventoryCounts.locationId,
        locationName: locations.name,
        startedAt: inventoryCounts.startedAt,
        completedAt: inventoryCounts.completedAt,
        notes: inventoryCounts.notes,
        createdAt: inventoryCounts.createdAt,
        updatedAt: inventoryCounts.updatedAt,
        itemCount: sql<number>`count(${inventoryCountItems.id})`,
        countedCount: sql<number>`count(${inventoryCountItems.countedQuantity})`,
      })
      .from(inventoryCounts)
      .leftJoin(locations, eq(inventoryCounts.locationId, locations.id))
      .leftJoin(
        inventoryCountItems,
        eq(inventoryCountItems.countId, inventoryCounts.id)
      )
      .where(and(...conditions))
      .groupBy(inventoryCounts.id, locations.name)
      .orderBy(inventoryCounts.createdAt);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/inventory-counts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory counts" },
      { status: 500 }
    );
  }
}

// POST /api/inventory-counts
// Body: { name, locationId? }
// Auto-populates items from current material_stocks for the selected location
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { name, locationId, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name ist erforderlich" },
        { status: 400 }
      );
    }

    // Fetch current stocks for org (optionally filtered by location)
    const stockConditions = [eq(materialStocks.organizationId, orgId)];
    if (locationId) {
      stockConditions.push(eq(materialStocks.locationId, locationId));
    }

    const stocks = await db
      .select({
        materialId: materialStocks.materialId,
        locationId: materialStocks.locationId,
        quantity: materialStocks.quantity,
      })
      .from(materialStocks)
      .where(and(...stockConditions));

    const count = await db.transaction(async (tx) => {
      const [newCount] = await tx
        .insert(inventoryCounts)
        .values({
          organizationId: orgId,
          name: name.trim(),
          locationId: locationId ?? null,
          status: "draft",
          notes: notes ?? null,
        })
        .returning();

      if (stocks.length > 0) {
        await tx.insert(inventoryCountItems).values(
          stocks.map((s) => ({
            countId: newCount!.id,
            materialId: s.materialId,
            locationId: s.locationId,
            expectedQuantity: s.quantity,
            countedQuantity: null,
            difference: null,
          }))
        );
      }

      return newCount;
    });

    return NextResponse.json(count, { status: 201 });
  } catch (error) {
    console.error("POST /api/inventory-counts error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory count" },
      { status: 500 }
    );
  }
}
