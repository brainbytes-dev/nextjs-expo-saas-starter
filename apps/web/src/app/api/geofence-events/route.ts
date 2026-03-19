import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { geofenceEvents, geofences, locations, users } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50"))
    );

    const items = await db
      .select({
        id: geofenceEvents.id,
        geofenceId: geofenceEvents.geofenceId,
        userId: geofenceEvents.userId,
        userName: users.name,
        eventType: geofenceEvents.eventType,
        triggeredAt: geofenceEvents.triggeredAt,
        latitude: geofenceEvents.latitude,
        longitude: geofenceEvents.longitude,
        autoAction: geofenceEvents.autoAction,
        locationName: locations.name,
      })
      .from(geofenceEvents)
      .leftJoin(geofences, eq(geofenceEvents.geofenceId, geofences.id))
      .leftJoin(locations, eq(geofences.locationId, locations.id))
      .leftJoin(users, eq(geofenceEvents.userId, users.id))
      .where(eq(geofenceEvents.organizationId, orgId))
      .orderBy(desc(geofenceEvents.triggeredAt))
      .limit(limit);

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("GET /api/geofence-events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geofence events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { geofenceId, eventType, latitude, longitude, autoAction } = body;

    if (!geofenceId || !eventType) {
      return NextResponse.json(
        { error: "geofenceId and eventType are required" },
        { status: 400 }
      );
    }

    if (!["enter", "exit"].includes(eventType)) {
      return NextResponse.json(
        { error: "eventType must be 'enter' or 'exit'" },
        { status: 400 }
      );
    }

    // Verify geofence belongs to org
    const [geofence] = await db
      .select()
      .from(geofences)
      .where(
        and(eq(geofences.id, geofenceId), eq(geofences.organizationId, orgId))
      )
      .limit(1);

    if (!geofence) {
      return NextResponse.json(
        { error: "Geofence not found" },
        { status: 404 }
      );
    }

    const [event] = await db
      .insert(geofenceEvents)
      .values({
        organizationId: orgId,
        geofenceId,
        userId: session.user.id,
        eventType,
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        autoAction: autoAction ?? null,
      })
      .returning();

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/geofence-events error:", error);
    return NextResponse.json(
      { error: "Failed to record geofence event" },
      { status: 500 }
    );
  }
}
