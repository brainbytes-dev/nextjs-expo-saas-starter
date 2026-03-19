import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { bleBeacons, locations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId");

    const conditions = [eq(bleBeacons.organizationId, orgId)];

    if (locationId) {
      conditions.push(eq(bleBeacons.locationId, locationId));
    }

    const items = await db
      .select({
        id: bleBeacons.id,
        organizationId: bleBeacons.organizationId,
        locationId: bleBeacons.locationId,
        locationName: locations.name,
        uuid: bleBeacons.uuid,
        major: bleBeacons.major,
        minor: bleBeacons.minor,
        name: bleBeacons.name,
        entityType: bleBeacons.entityType,
        entityId: bleBeacons.entityId,
        batteryLevel: bleBeacons.batteryLevel,
        lastSeenAt: bleBeacons.lastSeenAt,
        isActive: bleBeacons.isActive,
        createdAt: bleBeacons.createdAt,
        updatedAt: bleBeacons.updatedAt,
      })
      .from(bleBeacons)
      .leftJoin(locations, eq(bleBeacons.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(bleBeacons.name);

    // Compute stats
    const active = items.filter((b) => b.isActive);
    const lowBattery = items.filter(
      (b) => b.isActive && b.batteryLevel !== null && b.batteryLevel < 20
    );
    const coveredLocations = new Set(
      items.filter((b) => b.isActive && b.locationId).map((b) => b.locationId)
    );

    return NextResponse.json({
      data: items,
      stats: {
        active: active.length,
        lowBattery: lowBattery.length,
        coveredLocations: coveredLocations.size,
      },
    });
  } catch (error) {
    console.error("GET /api/ble-beacons error:", error);
    return NextResponse.json(
      { error: "Failed to fetch beacons" },
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
    const { locationId, beaconUuid, major, minor, name, entityType, entityId } =
      body;

    if (!beaconUuid) {
      return NextResponse.json(
        { error: "beaconUuid is required" },
        { status: 400 }
      );
    }

    const [beacon] = await db
      .insert(bleBeacons)
      .values({
        organizationId: orgId,
        locationId: locationId || null,
        uuid: beaconUuid,
        major: major ?? null,
        minor: minor ?? null,
        name: name || null,
        entityType: entityType || null,
        entityId: entityId || null,
      })
      .returning();

    return NextResponse.json(beacon, { status: 201 });
  } catch (error) {
    console.error("POST /api/ble-beacons error:", error);
    return NextResponse.json(
      { error: "Failed to create beacon" },
      { status: 500 }
    );
  }
}
