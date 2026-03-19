import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { geofences, locations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const items = await db
      .select({
        id: geofences.id,
        organizationId: geofences.organizationId,
        locationId: geofences.locationId,
        locationName: locations.name,
        latitude: geofences.latitude,
        longitude: geofences.longitude,
        radiusMeters: geofences.radiusMeters,
        autoCheckin: geofences.autoCheckin,
        autoCheckout: geofences.autoCheckout,
        isActive: geofences.isActive,
        createdAt: geofences.createdAt,
        updatedAt: geofences.updatedAt,
      })
      .from(geofences)
      .leftJoin(locations, eq(geofences.locationId, locations.id))
      .where(eq(geofences.organizationId, orgId))
      .orderBy(geofences.createdAt);

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("GET /api/geofences error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geofences" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { locationId, latitude, longitude, radiusMeters, autoCheckin, autoCheckout } = body;

    if (!locationId || !latitude || !longitude) {
      return NextResponse.json(
        { error: "locationId, latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Verify location belongs to org
    const [loc] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(eq(locations.id, locationId), eq(locations.organizationId, orgId))
      )
      .limit(1);

    if (!loc) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const [geofence] = await db
      .insert(geofences)
      .values({
        organizationId: orgId,
        locationId,
        latitude: String(latitude),
        longitude: String(longitude),
        radiusMeters: radiusMeters ?? 100,
        autoCheckin: autoCheckin ?? true,
        autoCheckout: autoCheckout ?? true,
      })
      .returning();

    return NextResponse.json(geofence, { status: 201 });
  } catch (error) {
    console.error("POST /api/geofences error:", error);
    return NextResponse.json(
      { error: "Failed to create geofence" },
      { status: 500 }
    );
  }
}
