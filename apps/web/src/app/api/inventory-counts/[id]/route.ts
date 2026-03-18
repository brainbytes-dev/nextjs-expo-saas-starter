import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  inventoryCounts,
  inventoryCountItems,
  materials,
  locations,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/inventory-counts/[id]  — count with all items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [count] = await db
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
      })
      .from(inventoryCounts)
      .leftJoin(locations, eq(inventoryCounts.locationId, locations.id))
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

    const items = await db
      .select({
        id: inventoryCountItems.id,
        materialId: inventoryCountItems.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        materialUnit: materials.unit,
        locationId: inventoryCountItems.locationId,
        locationName: locations.name,
        expectedQuantity: inventoryCountItems.expectedQuantity,
        countedQuantity: inventoryCountItems.countedQuantity,
        difference: inventoryCountItems.difference,
        countedAt: inventoryCountItems.countedAt,
        notes: inventoryCountItems.notes,
      })
      .from(inventoryCountItems)
      .leftJoin(materials, eq(inventoryCountItems.materialId, materials.id))
      .leftJoin(locations, eq(inventoryCountItems.locationId, locations.id))
      .where(eq(inventoryCountItems.countId, id))
      .orderBy(materials.name);

    return NextResponse.json({ ...count, items });
  } catch (error) {
    console.error("GET /api/inventory-counts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory count" },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory-counts/[id]
// Body: { status?, name?, notes?, complete: true }
// When complete: true → set status=completed, completedAt, completedBy
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const [existing] = await db
      .select({
        id: inventoryCounts.id,
        status: inventoryCounts.status,
        startedAt: inventoryCounts.startedAt,
      })
      .from(inventoryCounts)
      .where(
        and(
          eq(inventoryCounts.id, id),
          eq(inventoryCounts.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Inventur nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, status, notes, complete } = body;

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) updateFields.name = name;
    if (notes !== undefined) updateFields.notes = notes;
    if (status !== undefined) {
      const valid = ["draft", "in_progress", "completed", "cancelled"];
      if (!valid.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${valid.join(", ")}` },
          { status: 400 }
        );
      }
      updateFields.status = status;
      if (status === "in_progress" && !existing.startedAt) {
        updateFields.startedAt = new Date();
      }
    }
    if (complete === true) {
      updateFields.status = "completed";
      updateFields.completedAt = new Date();
      updateFields.completedBy = session.user.id;
    }

    const [updated] = await db
      .update(inventoryCounts)
      .set(updateFields)
      .where(eq(inventoryCounts.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/inventory-counts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory count" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory-counts/[id]  — only allowed for draft status
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [existing] = await db
      .select({ id: inventoryCounts.id, status: inventoryCounts.status })
      .from(inventoryCounts)
      .where(
        and(
          eq(inventoryCounts.id, id),
          eq(inventoryCounts.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Inventur nicht gefunden" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Nur Entwürfe können gelöscht werden" },
        { status: 409 }
      );
    }

    await db
      .delete(inventoryCounts)
      .where(eq(inventoryCounts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/inventory-counts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory count" },
      { status: 500 }
    );
  }
}
