import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { locations } from "@repo/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    const conditions = [
      eq(locations.organizationId, orgId),
      eq(locations.isActive, true),
    ];

    if (type) {
      const types = type.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length === 1) {
        conditions.push(eq(locations.type, types[0]!));
      } else if (types.length > 1) {
        conditions.push(inArray(locations.type, types));
      }
    }

    const items = await db
      .select()
      .from(locations)
      .where(and(...conditions))
      .orderBy(locations.name);

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/locations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
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
    const { name, type, category, template, address, latitude, longitude, metadata } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const [location] = await db
      .insert(locations)
      .values({
        organizationId: orgId,
        name,
        type,
        category,
        template,
        address,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        metadata: metadata ?? null,
      })
      .returning();

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("POST /api/locations error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
