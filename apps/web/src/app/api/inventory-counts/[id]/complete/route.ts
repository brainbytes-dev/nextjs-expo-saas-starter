import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  inventoryCounts,
  inventoryCountItems,
  materialStocks,
  stockChanges,
  organizations,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { sendInventoryCountCompletedEmail } from "@/lib/email";

// POST /api/inventory-counts/[id]/complete
// Atomically: marks count as completed + creates signed stock corrections for all diffs
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

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

    if (count.status !== "in_progress") {
      return NextResponse.json(
        { error: "Nur laufende Inventuren können abgeschlossen werden" },
        { status: 409 }
      );
    }

    const items = await db
      .select({
        materialId: inventoryCountItems.materialId,
        locationId: inventoryCountItems.locationId,
        countedQuantity: inventoryCountItems.countedQuantity,
        difference: inventoryCountItems.difference,
        expectedQuantity: inventoryCountItems.expectedQuantity,
      })
      .from(inventoryCountItems)
      .where(eq(inventoryCountItems.countId, id));

    const itemsWithDiffs = items.filter(
      (i) => i.countedQuantity !== null && i.difference !== null && i.difference !== 0
    );

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(inventoryCounts)
        .set({
          status: "completed",
          completedAt: now,
          completedBy: session.user.id,
          updatedAt: now,
        })
        .where(eq(inventoryCounts.id, id));

      for (const item of itemsWithDiffs) {
        const diff = item.difference!; // signed
        const counted = item.countedQuantity!;

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

        if (existing) {
          await tx
            .update(materialStocks)
            .set({ quantity: counted, updatedAt: now })
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
            quantity: counted,
          });
        }

        await tx.insert(stockChanges).values({
          organizationId: orgId,
          materialId: item.materialId,
          locationId: item.locationId,
          userId: session.user.id,
          changeType: "inventory",
          quantity: diff, // signed integer — positive = surplus, negative = shortage
          previousQuantity: previousQty,
          newQuantity: counted,
          notes: `Inventurkorrektur (${id}): Soll ${item.expectedQuantity}, Ist ${counted}`,
        });
      }
    });

    // Fire-and-forget completion email
    void (async () => {
      try {
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);
        await sendInventoryCountCompletedEmail({
          recipientEmail: session.user.email,
          recipientName: session.user.name || session.user.email,
          orgName: org?.name ?? orgId,
          correctionsCreated: itemsWithDiffs.length,
          countId: id,
        });
      } catch { /* non-critical */ }
    })();

    return NextResponse.json({
      success: true,
      correctionsCreated: itemsWithDiffs.length,
    });
  } catch (error) {
    console.error("POST /api/inventory-counts/[id]/complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete inventory count" },
      { status: 500 }
    );
  }
}
