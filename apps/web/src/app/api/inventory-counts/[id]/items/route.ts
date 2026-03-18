import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { inventoryCounts, inventoryCountItems } from "@repo/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// PATCH /api/inventory-counts/[id]/items
// Body: { updates: Array<{ id: string; countedQuantity: number; notes?: string }> }
// Batch-updates counted quantities and recalculates differences
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    // Verify the count belongs to this org and is not completed/cancelled
    const [count] = await db
      .select({ id: inventoryCounts.id, status: inventoryCounts.status })
      .from(inventoryCounts)
      .where(
        and(
          eq(inventoryCounts.id, id),
          eq(inventoryCounts.organizationId, orgId)
        )
      )
      .limit(1);

    if (!count) {
      return NextResponse.json(
        { error: "Inventur nicht gefunden" },
        { status: 404 }
      );
    }

    if (count.status === "completed" || count.status === "cancelled") {
      return NextResponse.json(
        { error: "Abgeschlossene oder stornierte Inventuren können nicht bearbeitet werden" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const updates: Array<{
      id: string;
      countedQuantity: number;
      notes?: string;
    }> = body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates array is required" },
        { status: 400 }
      );
    }

    // Validate input
    for (const u of updates) {
      if (typeof u.id !== "string" || typeof u.countedQuantity !== "number") {
        return NextResponse.json(
          { error: "Each update must have id (string) and countedQuantity (number)" },
          { status: 400 }
        );
      }
    }

    // Fetch existing items to compute difference
    const itemIds = updates.map((u) => u.id);
    const existingItems = await db
      .select({
        id: inventoryCountItems.id,
        expectedQuantity: inventoryCountItems.expectedQuantity,
      })
      .from(inventoryCountItems)
      .where(
        and(
          eq(inventoryCountItems.countId, id),
          inArray(inventoryCountItems.id, itemIds)
        )
      );

    const expectedMap = new Map(
      existingItems.map((item) => [item.id, item.expectedQuantity])
    );

    // Batch update each item
    const now = new Date();
    await Promise.all(
      updates.map((u) => {
        const expected = expectedMap.get(u.id) ?? 0;
        const difference = u.countedQuantity - expected;
        return db
          .update(inventoryCountItems)
          .set({
            countedQuantity: u.countedQuantity,
            difference,
            countedBy: session.user.id,
            countedAt: now,
            notes: u.notes ?? null,
          })
          .where(
            and(
              eq(inventoryCountItems.id, u.id),
              eq(inventoryCountItems.countId, id)
            )
          );
      })
    );

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("PATCH /api/inventory-counts/[id]/items error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory count items" },
      { status: 500 }
    );
  }
}
