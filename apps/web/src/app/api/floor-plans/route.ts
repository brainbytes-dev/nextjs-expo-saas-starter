import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { floorPlans, locations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ─── GET /api/floor-plans ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const rows = await db
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
      .where(eq(floorPlans.organizationId, orgId))
      .orderBy(floorPlans.createdAt);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET /api/floor-plans error:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Grundrisse" }, { status: 500 });
  }
}

// ─── POST /api/floor-plans ────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { locationId, name, imageUrl, items } = body as {
      locationId?: string;
      name?: string;
      imageUrl?: string;
      items?: unknown[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }
    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: "Bild-URL ist erforderlich" }, { status: 400 });
    }

    const [created] = await db
      .insert(floorPlans)
      .values({
        organizationId: orgId,
        locationId: locationId ?? null,
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        items: items ?? [],
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/floor-plans error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen des Grundrisses" }, { status: 500 });
  }
}
