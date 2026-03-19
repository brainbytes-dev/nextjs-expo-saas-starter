import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { stockChanges, materials, materialStocks } from "@repo/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { dispatchWebhook } from "@/lib/webhooks";
import { evaluateRules } from "@/lib/rules-engine";

const MAX_ITEMS = 100;

interface BatchItem {
  materialId: string;
  locationId: string;
  changeType: "in" | "out";
  quantity: number;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { items } = body as { items?: unknown[] };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array" },
        { status: 400 }
      );
    }

    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ITEMS} items per batch request` },
        { status: 400 }
      );
    }

    // Validate each item before touching the database
    const validChangeTypes = ["in", "out"] as const;
    const validated: BatchItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] as Record<string, unknown>;
      const { materialId, locationId, changeType, quantity, notes } = raw;

      if (!materialId || typeof materialId !== "string") {
        return NextResponse.json(
          { error: `items[${i}].materialId is required` },
          { status: 400 }
        );
      }
      if (!locationId || typeof locationId !== "string") {
        return NextResponse.json(
          { error: `items[${i}].locationId is required` },
          { status: 400 }
        );
      }
      if (!validChangeTypes.includes(changeType as "in" | "out")) {
        return NextResponse.json(
          { error: `items[${i}].changeType must be "in" or "out"` },
          { status: 400 }
        );
      }
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return NextResponse.json(
          { error: `items[${i}].quantity must be a positive integer` },
          { status: 400 }
        );
      }

      validated.push({
        materialId,
        locationId,
        changeType: changeType as "in" | "out",
        quantity: qty,
        notes: typeof notes === "string" ? notes : undefined,
      });
    }

    // Verify all materials belong to this org in one query
    const uniqueMaterialIds = [...new Set(validated.map((v) => v.materialId))];
    const foundMaterials = await db
      .select({ id: materials.id, name: materials.name, number: materials.number })
      .from(materials)
      .where(
        and(
          eq(materials.organizationId, orgId),
          inArray(materials.id, uniqueMaterialIds)
        )
      );

    const materialMap = new Map(foundMaterials.map((m) => [m.id, m]));
    const missingMaterial = validated.find((v) => !materialMap.has(v.materialId));
    if (missingMaterial) {
      return NextResponse.json(
        { error: `Material not found: ${missingMaterial.materialId}` },
        { status: 404 }
      );
    }

    // Process all items in a single transaction
    const createdChanges = await db.transaction(async (tx) => {
      const results = [];

      for (const item of validated) {
        const delta = item.changeType === "out" ? -item.quantity : item.quantity;

        const [existing] = await tx
          .select({ quantity: materialStocks.quantity })
          .from(materialStocks)
          .where(
            and(
              eq(materialStocks.materialId, item.materialId),
              eq(materialStocks.locationId, item.locationId)
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
                eq(materialStocks.materialId, item.materialId),
                eq(materialStocks.locationId, item.locationId)
              )
            );
        } else {
          await tx.insert(materialStocks).values({
            organizationId: orgId,
            materialId: item.materialId,
            locationId: item.locationId,
            quantity: newQty,
          });
        }

        const [change] = await tx
          .insert(stockChanges)
          .values({
            organizationId: orgId,
            materialId: item.materialId,
            locationId: item.locationId,
            userId: session.user.id,
            changeType: item.changeType,
            quantity: delta,
            previousQuantity: previousQty,
            newQuantity: newQty,
            notes: item.notes,
          })
          .returning();

        results.push({ change: change!, material: materialMap.get(item.materialId)! });
      }

      return results;
    });

    // Fire-and-forget side effects outside the transaction
    for (const { change, material } of createdChanges) {
      const ctx = {
        id: change.id,
        materialId: change.materialId,
        materialName: material.name,
        materialNumber: material.number,
        locationId: change.locationId,
        changeType: change.changeType,
        quantity: change.quantity,
        previousQuantity: change.previousQuantity,
        newQuantity: change.newQuantity,
        userId: session.user.id,
        notes: change.notes ?? null,
        createdAt: change.createdAt,
      };
      dispatchWebhook(orgId, "stock.changed", ctx);
      evaluateRules(orgId, "stock.changed", ctx);
    }

    return NextResponse.json(
      { data: createdChanges.map(({ change }) => change), count: createdChanges.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/stock-changes/batch error:", error);
    return NextResponse.json(
      { error: "Failed to process batch stock changes" },
      { status: 500 }
    );
  }
}
