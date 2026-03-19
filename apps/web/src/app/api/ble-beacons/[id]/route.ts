import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { bleBeacons } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
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
      .from(bleBeacons)
      .where(and(eq(bleBeacons.id, id), eq(bleBeacons.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Beacon not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updatableFields = [
      "name",
      "locationId",
      "uuid",
      "major",
      "minor",
      "entityType",
      "entityId",
      "batteryLevel",
      "lastSeenAt",
      "isActive",
    ] as const;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === "lastSeenAt" && typeof body[field] === "string") {
          updates[field] = new Date(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    const [updated] = await db
      .update(bleBeacons)
      .set(updates)
      .where(eq(bleBeacons.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/ble-beacons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update beacon" },
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
      .from(bleBeacons)
      .where(and(eq(bleBeacons.id, id), eq(bleBeacons.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Beacon not found" },
        { status: 404 }
      );
    }

    await db.delete(bleBeacons).where(eq(bleBeacons.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ble-beacons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete beacon" },
      { status: 500 }
    );
  }
}
