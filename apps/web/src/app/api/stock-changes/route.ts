import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { stockChanges, materials, materialStocks, locations, users } from "@repo/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { dispatchWebhook } from "@/lib/webhooks";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const materialId = url.searchParams.get("materialId");
    const locationId = url.searchParams.get("locationId");
    const changeType = url.searchParams.get("changeType");
    const offset = (page - 1) * limit;

    const conditions = [eq(stockChanges.organizationId, orgId)];
    if (materialId) {
      conditions.push(eq(stockChanges.materialId, materialId));
    }
    if (locationId) {
      conditions.push(eq(stockChanges.locationId, locationId));
    }
    if (changeType) {
      conditions.push(eq(stockChanges.changeType, changeType));
    }

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: stockChanges.id,
          materialId: stockChanges.materialId,
          materialName: materials.name,
          materialNumber: materials.number,
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
          targetLocationId: stockChanges.targetLocationId,
          notes: stockChanges.notes,
          createdAt: stockChanges.createdAt,
        })
        .from(stockChanges)
        .leftJoin(materials, eq(stockChanges.materialId, materials.id))
        .leftJoin(locations, eq(stockChanges.locationId, locations.id))
        .leftJoin(users, eq(stockChanges.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(stockChanges.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(stockChanges)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/stock-changes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock changes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { materialId, locationId, changeType, quantity, notes, batchNumber, serialNumber } = body;

    if (!materialId || !locationId || !changeType || quantity === undefined) {
      return NextResponse.json(
        { error: "materialId, locationId, changeType, and quantity are required" },
        { status: 400 }
      );
    }

    const validTypes = ["in", "out", "correction", "inventory", "transfer"];
    if (!validTypes.includes(changeType)) {
      return NextResponse.json(
        { error: `changeType must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return NextResponse.json(
        { error: "quantity must be a positive integer" },
        { status: 400 }
      );
    }

    // Verify material belongs to org
    const [material] = await db
      .select({ id: materials.id, name: materials.name, number: materials.number })
      .from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Compute delta: "out" quantities should be negative in the DB
    const delta = changeType === "out" ? -Math.abs(quantity) : Number(quantity);

    // Transaction: read current stock → compute new qty → upsert materialStocks → insert stockChange
    const stockChange = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ quantity: materialStocks.quantity })
        .from(materialStocks)
        .where(
          and(
            eq(materialStocks.materialId, materialId),
            eq(materialStocks.locationId, locationId)
          )
        )
        .limit(1);

      const previousQty = existing?.quantity ?? 0;
      const newQty = previousQty + delta;

      if (existing) {
        await tx
          .update(materialStocks)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(
            and(
              eq(materialStocks.materialId, materialId),
              eq(materialStocks.locationId, locationId)
            )
          );
      } else {
        await tx.insert(materialStocks).values({
          organizationId: orgId,
          materialId,
          locationId,
          quantity: newQty,
        });
      }

      const [change] = await tx
        .insert(stockChanges)
        .values({
          organizationId: orgId,
          materialId,
          locationId,
          userId: session.user.id,
          changeType,
          quantity: delta,
          previousQuantity: previousQty,
          newQuantity: newQty,
          batchNumber,
          serialNumber,
          notes,
        })
        .returning();

      return change;
    });

    // Dispatch webhook — fire-and-forget, outside the transaction
    dispatchWebhook(orgId, "stock.changed", {
      id: stockChange.id,
      materialId,
      materialName: material.name,
      materialNumber: material.number,
      locationId,
      changeType,
      quantity: delta,
      previousQuantity: stockChange.previousQuantity,
      newQuantity: stockChange.newQuantity,
      userId: session.user.id,
      notes: notes ?? null,
      createdAt: stockChange.createdAt,
    });

    // TODO: Add dispatchWebhook to tool booking routes:
    //   POST /api/tools/:id/booking → "tool.checked_out" / "tool.checked_in"
    // TODO: Add dispatchWebhook to commission routes:
    //   POST /api/commissions → "commission.created"
    //   PATCH /api/commissions/:id → "commission.status_changed"
    // TODO: Add dispatchWebhook to team/member routes:
    //   POST /api/team/invite → "member.invited"
    //   DELETE /api/team/:id → "member.removed"

    return NextResponse.json(stockChange, { status: 201 });
  } catch (error) {
    console.error("POST /api/stock-changes error:", error);
    return NextResponse.json(
      { error: "Failed to create stock change" },
      { status: 500 }
    );
  }
}
