import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  tools,
  toolGroups,
  locations,
  users,
  toolBookings,
  customFieldValues,
  customFieldDefinitions,
  auditLog,
} from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [tool] = await db
      .select({
        id: tools.id,
        organizationId: tools.organizationId,
        number: tools.number,
        name: tools.name,
        groupId: tools.groupId,
        groupName: toolGroups.name,
        homeLocationId: tools.homeLocationId,
        homeLocationName: locations.name,
        assignedToId: tools.assignedToId,
        assignedUserName: users.name,
        assignedLocationId: tools.assignedLocationId,
        barcode: tools.barcode,
        image: tools.image,
        manufacturer: tools.manufacturer,
        manufacturerNumber: tools.manufacturerNumber,
        serialNumber: tools.serialNumber,
        condition: tools.condition,
        maintenanceIntervalDays: tools.maintenanceIntervalDays,
        lastMaintenanceDate: tools.lastMaintenanceDate,
        nextMaintenanceDate: tools.nextMaintenanceDate,
        notes: tools.notes,
        purchasePrice: tools.purchasePrice,
        purchaseDate: tools.purchaseDate,
        expectedLifeYears: tools.expectedLifeYears,
        salvageValue: tools.salvageValue,
        depreciationMethod: tools.depreciationMethod,
        isActive: tools.isActive,
        createdAt: tools.createdAt,
        updatedAt: tools.updatedAt,
      })
      .from(tools)
      .leftJoin(toolGroups, eq(tools.groupId, toolGroups.id))
      .leftJoin(locations, eq(tools.homeLocationId, locations.id))
      .leftJoin(users, eq(tools.assignedToId, users.id))
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Recent bookings
    const recentBookings = await db
      .select()
      .from(toolBookings)
      .where(eq(toolBookings.toolId, id))
      .orderBy(desc(toolBookings.createdAt))
      .limit(20);

    // Custom fields — tables may not be migrated yet
    let customFields: unknown[] = [];
    try {
      customFields = await db
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
    } catch {
      // custom fields tables may not be migrated yet
    }

    return NextResponse.json({
      ...tool,
      recentBookings,
      customFields,
    });
  } catch (error) {
    console.error("GET /api/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tool" },
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

    const [existing] = await db
      .select()
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const body = await request.json();
    const updatableFields = [
      "number",
      "name",
      "groupId",
      "homeLocationId",
      "assignedToId",
      "assignedLocationId",
      "barcode",
      "image",
      "manufacturer",
      "manufacturerNumber",
      "serialNumber",
      "condition",
      "maintenanceIntervalDays",
      "lastMaintenanceDate",
      "nextMaintenanceDate",
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
      .update(tools)
      .set(updates)
      .where(eq(tools.id, id))
      .returning();

    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(
        auditEntries.map((entry) => ({
          organizationId: orgId,
          objectType: "tool",
          objectId: id,
          userId: session.user.id,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        }))
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update tool" },
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
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Soft delete
    await db
      .update(tools)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tools.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}
