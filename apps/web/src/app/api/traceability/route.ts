import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockChanges,
  materialStocks,
  materials,
  locations,
  users,
  suppliers,
  orders,
  commissions,
} from "@repo/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const batchParam = url.searchParams.get("batch");
    const serialParam = url.searchParams.get("serial");

    if (!batchParam && !serialParam) {
      return NextResponse.json(
        { error: "Query parameter 'batch' or 'serial' is required" },
        { status: 400 }
      );
    }

    // Build filter conditions for stockChanges
    const conditions = [eq(stockChanges.organizationId, orgId)];
    if (batchParam && serialParam) {
      conditions.push(
        or(
          eq(stockChanges.batchNumber, batchParam),
          eq(stockChanges.serialNumber, serialParam)
        )!
      );
    } else if (batchParam) {
      conditions.push(eq(stockChanges.batchNumber, batchParam));
    } else if (serialParam) {
      conditions.push(eq(stockChanges.serialNumber, serialParam!));
    }

    // Fetch all stock changes matching the batch/serial
    const changes = await db
      .select({
        id: stockChanges.id,
        materialId: stockChanges.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        materialUnit: materials.unit,
        locationId: stockChanges.locationId,
        locationName: locations.name,
        userId: stockChanges.userId,
        userName: users.name,
        changeType: stockChanges.changeType,
        quantity: stockChanges.quantity,
        previousQuantity: stockChanges.previousQuantity,
        newQuantity: stockChanges.newQuantity,
        batchNumber: stockChanges.batchNumber,
        serialNumber: stockChanges.serialNumber,
        commissionId: stockChanges.commissionId,
        orderId: stockChanges.orderId,
        notes: stockChanges.notes,
        createdAt: stockChanges.createdAt,
      })
      .from(stockChanges)
      .leftJoin(materials, eq(stockChanges.materialId, materials.id))
      .leftJoin(locations, eq(stockChanges.locationId, locations.id))
      .leftJoin(users, eq(stockChanges.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(stockChanges.createdAt));

    if (changes.length === 0) {
      return NextResponse.json({ changes: [], currentStock: [], summary: null });
    }

    // Determine all unique materialIds for current stock lookup
    const materialIds = [...new Set(changes.map((c) => c.materialId))];

    // Fetch current stock positions for these materials with matching batch/serial
    const stockConditions = [eq(materialStocks.organizationId, orgId)];
    if (batchParam) {
      stockConditions.push(eq(materialStocks.batchNumber, batchParam));
    }
    if (serialParam) {
      stockConditions.push(eq(materialStocks.serialNumber, serialParam!));
    }

    const currentStock = await db
      .select({
        id: materialStocks.id,
        materialId: materialStocks.materialId,
        materialName: materials.name,
        locationId: materialStocks.locationId,
        locationName: locations.name,
        quantity: materialStocks.quantity,
        batchNumber: materialStocks.batchNumber,
        serialNumber: materialStocks.serialNumber,
        expiryDate: materialStocks.expiryDate,
      })
      .from(materialStocks)
      .leftJoin(materials, eq(materialStocks.materialId, materials.id))
      .leftJoin(locations, eq(materialStocks.locationId, locations.id))
      .where(and(...stockConditions));

    // Enrich changes with commission and order info via lookup
    const commissionIds = [...new Set(changes.map((c) => c.commissionId).filter(Boolean))] as string[];
    const orderIds = [...new Set(changes.map((c) => c.orderId).filter(Boolean))] as string[];

    const [commissionData, orderData] = await Promise.all([
      commissionIds.length > 0
        ? db
            .select({
              id: commissions.id,
              name: commissions.name,
              number: commissions.number,
              manualNumber: commissions.manualNumber,
              status: commissions.status,
            })
            .from(commissions)
            .where(eq(commissions.organizationId, orgId))
        : Promise.resolve([]),

      orderIds.length > 0
        ? db
            .select({
              id: orders.id,
              orderNumber: orders.orderNumber,
              ownOrderNumber: orders.ownOrderNumber,
              status: orders.status,
              orderDate: orders.orderDate,
              supplierId: orders.supplierId,
              supplierName: suppliers.name,
            })
            .from(orders)
            .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
            .where(eq(orders.organizationId, orgId))
        : Promise.resolve([]),
    ]);

    const commissionMap = new Map(commissionData.map((c) => [c.id, c]));
    const orderMap = new Map(orderData.map((o) => [o.id, o]));

    const enrichedChanges = changes.map((change) => ({
      ...change,
      commission: change.commissionId ? commissionMap.get(change.commissionId) ?? null : null,
      order: change.orderId ? orderMap.get(change.orderId) ?? null : null,
    }));

    // Build summary
    const firstChange = enrichedChanges[enrichedChanges.length - 1];
    const lastChange = enrichedChanges[0];
    const totalIn = enrichedChanges
      .filter((c) => c.quantity > 0)
      .reduce((sum, c) => sum + c.quantity, 0);
    const totalOut = enrichedChanges
      .filter((c) => c.quantity < 0)
      .reduce((sum, c) => sum + Math.abs(c.quantity), 0);
    const currentTotal = currentStock.reduce((sum, s) => sum + s.quantity, 0);

    const summary = {
      batchNumber: batchParam ?? null,
      serialNumber: serialParam ?? null,
      materialId: firstChange?.materialId ?? null,
      materialName: firstChange?.materialName ?? null,
      materialNumber: firstChange?.materialNumber ?? null,
      materialUnit: firstChange?.materialUnit ?? null,
      firstSeen: firstChange?.createdAt ?? null,
      lastSeen: lastChange?.createdAt ?? null,
      totalIn,
      totalOut,
      currentQuantity: currentTotal,
      locationCount: currentStock.length,
    };

    return NextResponse.json({
      summary,
      changes: enrichedChanges,
      currentStock,
    });
  } catch (error) {
    console.error("GET /api/traceability error:", error);
    return NextResponse.json(
      { error: "Failed to fetch traceability data" },
      { status: 500 }
    );
  }
}
