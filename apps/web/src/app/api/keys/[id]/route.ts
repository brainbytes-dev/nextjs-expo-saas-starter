import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { keys, locations, users, auditLog } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [key] = await db
      .select({
        id: keys.id,
        organizationId: keys.organizationId,
        number: keys.number,
        name: keys.name,
        address: keys.address,
        quantity: keys.quantity,
        homeLocationId: keys.homeLocationId,
        homeLocationName: locations.name,
        assignedToId: keys.assignedToId,
        assignedToName: users.name,
        assignedLocationId: keys.assignedLocationId,
        barcode: keys.barcode,
        image: keys.image,
        notes: keys.notes,
        status: keys.status,
        isActive: keys.isActive,
        createdAt: keys.createdAt,
        updatedAt: keys.updatedAt,
      })
      .from(keys)
      .leftJoin(locations, eq(keys.homeLocationId, locations.id))
      .leftJoin(users, eq(keys.assignedToId, users.id))
      .where(and(eq(keys.id, id), eq(keys.organizationId, orgId)))
      .limit(1);

    if (!key) {
      return NextResponse.json(
        { error: "Key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(key);
  } catch (error) {
    console.error("GET /api/keys/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch key" },
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

    // Verify key belongs to org
    const [existing] = await db
      .select()
      .from(keys)
      .where(and(eq(keys.id, id), eq(keys.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Key not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const VALID_STATUSES = ["available", "issued", "lost", "defective", "retired"] as const;
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const updatableFields = [
      "number",
      "name",
      "address",
      "quantity",
      "homeLocationId",
      "assignedToId",
      "assignedLocationId",
      "barcode",
      "image",
      "notes",
      "status",
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
      .update(keys)
      .set(updates)
      .where(eq(keys.id, id))
      .returning();

    // Create audit log entries
    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(
        auditEntries.map((entry) => ({
          organizationId: orgId,
          objectType: "key",
          objectId: id,
          userId: session.user.id,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        }))
      );
    }

    // TODO: Add key.updated webhook event type
    if (auditEntries.length > 0) {
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/keys/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update key" },
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
      .from(keys)
      .where(and(eq(keys.id, id), eq(keys.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Key not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(keys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(keys.id, id));

    // TODO: Add key.deleted webhook event type
    void ({
      id: existing.id,
      name: existing.name,
      number: existing.number,
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/keys/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete key" },
      { status: 500 }
    );
  }
}
