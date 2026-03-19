import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { geofences } from "@repo/db/schema";
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
      .from(geofences)
      .where(and(eq(geofences.id, id), eq(geofences.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Geofence not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updatableFields = [
      "latitude",
      "longitude",
      "radiusMeters",
      "autoCheckin",
      "autoCheckout",
      "isActive",
    ] as const;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updates[field] = field === "latitude" || field === "longitude"
          ? String(body[field])
          : body[field];
      }
    }

    const [updated] = await db
      .update(geofences)
      .set(updates)
      .where(eq(geofences.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/geofences/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update geofence" },
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
      .from(geofences)
      .where(and(eq(geofences.id, id), eq(geofences.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Geofence not found" },
        { status: 404 }
      );
    }

    await db.delete(geofences).where(eq(geofences.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/geofences/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete geofence" },
      { status: 500 }
    );
  }
}
