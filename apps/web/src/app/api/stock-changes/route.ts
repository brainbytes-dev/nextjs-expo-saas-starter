import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { parseJsonBody } from "@/app/api/_helpers/parse-body";
import { stockChanges, materials, materialStocks, locations, users, projects } from "@repo/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { dispatchWebhook } from "@/lib/webhooks";
import { evaluateRules } from "@/lib/rules-engine";
import { sendPushToOrg } from "@/lib/push-notifications";
import { trackFeature } from "@/lib/track-feature";

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
    const projectId = url.searchParams.get("projectId");
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
    if (projectId) {
      conditions.push(eq(stockChanges.projectId, projectId));
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
          projectId: stockChanges.projectId,
          projectName: projects.name,
          projectCostCenter: projects.costCenter,
          notes: stockChanges.notes,
          createdAt: stockChanges.createdAt,
        })
        .from(stockChanges)
        .leftJoin(materials, eq(stockChanges.materialId, materials.id))
        .leftJoin(locations, eq(stockChanges.locationId, locations.id))
        .leftJoin(users, eq(stockChanges.userId, users.id))
        .leftJoin(projects, eq(stockChanges.projectId, projects.id))
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

    const parsed = await parseJsonBody(request);
    if ("error" in parsed) return parsed.error;
    const { materialId, locationId, changeType, quantity, notes, batchNumber, serialNumber, projectId } = parsed.data as {
      materialId: unknown; locationId: unknown; changeType: unknown; quantity: unknown;
      notes?: string; batchNumber?: string; serialNumber?: string; projectId?: string;
    };

    if (!materialId || !locationId || !changeType || quantity === undefined) {
      return NextResponse.json(
        { error: "materialId, locationId, changeType, and quantity are required" },
        { status: 400 }
      );
    }

    // Validate that IDs are non-empty strings
    if (typeof materialId !== "string" || materialId.trim() === "") {
      return NextResponse.json({ error: "materialId must be a non-empty string" }, { status: 400 });
    }
    if (typeof locationId !== "string" || locationId.trim() === "") {
      return NextResponse.json({ error: "locationId must be a non-empty string" }, { status: 400 });
    }

    const validTypes = ["in", "out", "correction", "inventory", "transfer"];
    if (typeof changeType !== "string" || !validTypes.includes(changeType)) {
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

    // Type-narrowed values (validated above)
    const typedMaterialId = materialId as string;
    const typedLocationId = locationId as string;
    const typedChangeType = changeType as string;

    // Verify material belongs to org
    const [material] = await db
      .select({ id: materials.id, name: materials.name, number: materials.number, reorderLevel: materials.reorderLevel })
      .from(materials)
      .where(and(eq(materials.id, typedMaterialId), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Validate projectId if provided
    if (projectId) {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
        .limit(1);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    // Compute delta: "out" quantities should be negative in the DB
    const delta = typedChangeType === "out" ? -Math.abs(qty) : qty;

    // Transaction: read current stock → compute new qty → upsert materialStocks → insert stockChange
    const stockChange = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ quantity: materialStocks.quantity })
        .from(materialStocks)
        .where(
          and(
            eq(materialStocks.materialId, typedMaterialId),
            eq(materialStocks.locationId, typedLocationId)
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
              eq(materialStocks.materialId, typedMaterialId),
              eq(materialStocks.locationId, typedLocationId)
            )
          );
      } else {
        await tx.insert(materialStocks).values({
          organizationId: orgId,
          materialId: typedMaterialId,
          locationId: typedLocationId,
          quantity: newQty,
        });
      }

      const [change] = await tx
        .insert(stockChanges)
        .values({
          organizationId: orgId,
          materialId: typedMaterialId,
          locationId: typedLocationId,
          userId: session.user.id,
          changeType: typedChangeType,
          quantity: delta,
          previousQuantity: previousQty,
          newQuantity: newQty,
          batchNumber,
          serialNumber,
          projectId: projectId ?? null,
          notes,
        })
        .returning();

      return change;
    });

    // Build event context — shared by both the webhook and the rules engine
    const eventContext = {
      id: stockChange.id,
      materialId: typedMaterialId,
      materialName: material.name,
      materialNumber: material.number,
      locationId: typedLocationId,
      changeType: typedChangeType,
      quantity: delta,
      previousQuantity: stockChange.previousQuantity,
      newQuantity: stockChange.newQuantity,
      projectId: projectId ?? null,
      userId: session.user.id,
      notes: notes ?? null,
      createdAt: stockChange.createdAt,
    };

    trackFeature(db, orgId, "stock_changes");
    // Dispatch webhook — fire-and-forget, outside the transaction
    dispatchWebhook(orgId, "stock.changed", eventContext);

    // Evaluate workflow rules — fire-and-forget, does not block the response
    evaluateRules(orgId, "stock.changed", eventContext);

    // Push notification — low stock alert (fire-and-forget)
    const reorderLevel = material.reorderLevel ?? 0;
    const newQty = stockChange.newQuantity ?? 0;
    if (reorderLevel > 0 && newQty <= reorderLevel) {
      sendPushToOrg(
        orgId,
        "Niedriger Bestand",
        `${material.name} ist unter dem Meldebestand (${newQty}/${reorderLevel})`,
        { type: "low_stock", materialId: typedMaterialId }
      ).catch((err) => console.error("Push (low stock) failed:", err));
    }

    return NextResponse.json(stockChange, { status: 201 });
  } catch (error) {
    console.error("POST /api/stock-changes error:", error);
    return NextResponse.json(
      { error: "Failed to create stock change" },
      { status: 500 }
    );
  }
}
