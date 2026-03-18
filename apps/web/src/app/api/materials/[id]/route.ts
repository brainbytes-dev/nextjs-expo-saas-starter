import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  materials,
  materialGroups,
  locations,
  materialStocks,
  customFieldValues,
  customFieldDefinitions,
  auditLog,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { dispatchWebhook } from "@/lib/webhooks";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [material] = await db
      .select({
        id: materials.id,
        organizationId: materials.organizationId,
        number: materials.number,
        name: materials.name,
        groupId: materials.groupId,
        groupName: materialGroups.name,
        mainLocationId: materials.mainLocationId,
        mainLocationName: locations.name,
        unit: materials.unit,
        barcode: materials.barcode,
        image: materials.image,
        manufacturer: materials.manufacturer,
        manufacturerNumber: materials.manufacturerNumber,
        reorderLevel: materials.reorderLevel,
        notes: materials.notes,
        isActive: materials.isActive,
        createdAt: materials.createdAt,
        updatedAt: materials.updatedAt,
      })
      .from(materials)
      .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
      .leftJoin(locations, eq(materials.mainLocationId, locations.id))
      .where(and(eq(materials.id, id), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Fetch stocks per location
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
      .where(eq(materialStocks.materialId, id));

    // Fetch custom fields
    const customFields = await db
      .select({
        id: customFieldValues.id,
        definitionId: customFieldValues.definitionId,
        fieldName: customFieldDefinitions.name,
        fieldType: customFieldDefinitions.fieldType,
        value: customFieldValues.value,
      })
      .from(customFieldValues)
      .innerJoin(
        customFieldDefinitions,
        eq(customFieldValues.definitionId, customFieldDefinitions.id)
      )
      .where(eq(customFieldValues.entityId, id));

    return NextResponse.json({
      ...material,
      stocks,
      customFields,
    });
  } catch (error) {
    console.error("GET /api/materials/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch material" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    // Verify material belongs to org
    const [existing] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updatableFields = [
      "number",
      "name",
      "groupId",
      "mainLocationId",
      "unit",
      "barcode",
      "image",
      "manufacturer",
      "manufacturerNumber",
      "reorderLevel",
      "notes",
    ] as const;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const auditEntries: { field: string; oldValue: string; newValue: string }[] = [];

    for (const field of updatableFields) {
      if (body[field] !== undefined && body[field] !== existing[field]) {
        auditEntries.push({
          field,
          oldValue: String(existing[field] ?? ""),
          newValue: String(body[field] ?? ""),
        });
        updates[field] = body[field];
      }
    }

    const [updated] = await db
      .update(materials)
      .set(updates)
      .where(eq(materials.id, id))
      .returning();

    // Create audit log entries
    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(
        auditEntries.map((entry) => ({
          organizationId: orgId,
          objectType: "material",
          objectId: id,
          userId: session.user.id,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        }))
      );
    }

    // Dispatch webhook — fire-and-forget
    if (auditEntries.length > 0) {
      dispatchWebhook(orgId, "material.updated", {
        id: updated.id,
        name: updated.name,
        changes: auditEntries.map(({ field, oldValue, newValue }) => ({
          field,
          oldValue,
          newValue,
        })),
        updatedAt: updated.updatedAt,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/materials/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

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
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(materials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(materials.id, id));

    // Dispatch webhook — fire-and-forget
    dispatchWebhook(orgId, "material.deleted", {
      id: existing.id,
      name: existing.name,
      number: existing.number,
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/materials/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
