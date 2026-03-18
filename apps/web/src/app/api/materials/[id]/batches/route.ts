import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  materialStocks,
  stockChanges,
  locations,
  materials,
  users,
} from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Verify material belongs to org
    const [material] = await db
      .select({ id: materials.id, name: materials.name, unit: materials.unit })
      .from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Fetch all stock entries (including batch/serial info) across all locations
    const stocks = await db
      .select({
        id: materialStocks.id,
        locationId: materialStocks.locationId,
        locationName: locations.name,
        quantity: materialStocks.quantity,
        batchNumber: materialStocks.batchNumber,
        serialNumber: materialStocks.serialNumber,
        expiryDate: materialStocks.expiryDate,
        minStock: materialStocks.minStock,
        maxStock: materialStocks.maxStock,
      })
      .from(materialStocks)
      .leftJoin(locations, eq(materialStocks.locationId, locations.id))
      .where(
        and(
          eq(materialStocks.materialId, materialId),
          eq(materialStocks.organizationId, orgId)
        )
      );

    // For each batch/serial entry, fetch associated stock change history
    const batchKeys = new Set(
      stocks
        .filter((s) => s.batchNumber || s.serialNumber)
        .map((s) => `${s.batchNumber ?? ""}::${s.serialNumber ?? ""}`)
    );

    // Fetch all stock changes for this material that have batch/serial numbers
    const allChanges = await db
      .select({
        id: stockChanges.id,
        changeType: stockChanges.changeType,
        quantity: stockChanges.quantity,
        previousQuantity: stockChanges.previousQuantity,
        newQuantity: stockChanges.newQuantity,
        batchNumber: stockChanges.batchNumber,
        serialNumber: stockChanges.serialNumber,
        locationId: stockChanges.locationId,
        locationName: locations.name,
        userId: stockChanges.userId,
        userName: users.name,
        notes: stockChanges.notes,
        commissionId: stockChanges.commissionId,
        orderId: stockChanges.orderId,
        createdAt: stockChanges.createdAt,
      })
      .from(stockChanges)
      .leftJoin(locations, eq(stockChanges.locationId, locations.id))
      .leftJoin(users, eq(stockChanges.userId, users.id))
      .where(
        and(
          eq(stockChanges.materialId, materialId),
          eq(stockChanges.organizationId, orgId)
        )
      )
      .orderBy(desc(stockChanges.createdAt));

    // Group changes by batch/serial key
    const changesByKey: Record<string, typeof allChanges> = {};
    for (const change of allChanges) {
      if (!change.batchNumber && !change.serialNumber) continue;
      const key = `${change.batchNumber ?? ""}::${change.serialNumber ?? ""}`;
      if (!changesByKey[key]) changesByKey[key] = [];
      changesByKey[key].push(change);
    }

    // Build enriched batch/serial entries
    const batches = stocks.map((stock) => {
      const key = `${stock.batchNumber ?? ""}::${stock.serialNumber ?? ""}`;
      const history = changesByKey[key] ?? [];
      return {
        ...stock,
        history,
      };
    });

    return NextResponse.json({ material, batches });
  } catch (error) {
    console.error("GET /api/materials/[id]/batches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch/serial data" },
      { status: 500 }
    );
  }
}
