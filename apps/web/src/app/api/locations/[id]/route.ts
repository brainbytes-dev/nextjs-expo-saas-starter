import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  locations,
  materialStocks,
  tools,
  keys,
} from "@repo/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organizationId, orgId)))
      .limit(1);

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Stock summary
    const [materialCount] = await db
      .select({ count: sql<number>`count(distinct ${materialStocks.materialId})` })
      .from(materialStocks)
      .where(
        and(
          eq(materialStocks.locationId, id),
          eq(materialStocks.organizationId, orgId)
        )
      );

    let toolCount: { count: number } | undefined;
    try {
      [toolCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tools)
        .where(
          and(
            or(eq(tools.homeLocationId, id), eq(tools.assignedLocationId, id))!,
            eq(tools.organizationId, orgId),
            eq(tools.isActive, true)
          )
        );
    } catch { /* column may not be migrated */ }

    let keyCount: { count: number } | undefined;
    try {
      [keyCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(keys)
        .where(
          and(
            or(eq(keys.homeLocationId, id), eq(keys.assignedLocationId, id))!,
            eq(keys.organizationId, orgId),
            eq(keys.isActive, true)
          )
        );
    } catch { /* column may not be migrated */ }

    return NextResponse.json({
      ...location,
      stockSummary: {
        materials: Number(materialCount?.count ?? 0),
        tools: Number(toolCount?.count ?? 0),
        keys: Number(keyCount?.count ?? 0),
      },
    });
  } catch (error) {
    console.error("GET /api/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
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
    const { db, orgId } = result;

    const [existing] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, type, category, template, address, latitude, longitude } = body;

    const [updated] = await db
      .update(locations)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(template !== undefined && { template }),
        ...(address !== undefined && { address }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        updatedAt: new Date(),
      })
      .where(eq(locations.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
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
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(locations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(locations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
