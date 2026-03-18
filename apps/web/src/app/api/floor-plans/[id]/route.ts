import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { floorPlans, locations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ─── GET /api/floor-plans/[id] ────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    const [row] = await db
      .select({
        id: floorPlans.id,
        name: floorPlans.name,
        locationId: floorPlans.locationId,
        locationName: locations.name,
        imageUrl: floorPlans.imageUrl,
        items: floorPlans.items,
        createdAt: floorPlans.createdAt,
        updatedAt: floorPlans.updatedAt,
      })
      .from(floorPlans)
      .leftJoin(locations, eq(floorPlans.locationId, locations.id))
      .where(and(eq(floorPlans.id, id), eq(floorPlans.organizationId, orgId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Grundriss nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GET /api/floor-plans/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Laden des Grundrisses" }, { status: 500 });
  }
}

// ─── PATCH /api/floor-plans/[id] ─────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    const body = await request.json();
    const { name, locationId, imageUrl, items } = body as {
      name?: string;
      locationId?: string | null;
      imageUrl?: string;
      items?: unknown[];
    };

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateValues.name = name.trim();
    if (locationId !== undefined) updateValues.locationId = locationId;
    if (imageUrl !== undefined) updateValues.imageUrl = imageUrl.trim();
    if (items !== undefined) updateValues.items = items;

    const [updated] = await db
      .update(floorPlans)
      .set(updateValues)
      .where(and(eq(floorPlans.id, id), eq(floorPlans.organizationId, orgId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Grundriss nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/floor-plans/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren des Grundrisses" }, { status: 500 });
  }
}

// ─── DELETE /api/floor-plans/[id] ────────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    const deleted = await db
      .delete(floorPlans)
      .where(and(eq(floorPlans.id, id), eq(floorPlans.organizationId, orgId)))
      .returning({ id: floorPlans.id });

    if (!deleted.length) {
      return NextResponse.json({ error: "Grundriss nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/floor-plans/[id] error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen des Grundrisses" }, { status: 500 });
  }
}
