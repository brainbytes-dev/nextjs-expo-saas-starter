import { NextResponse } from "next/server";
import { keys, locations, users } from "@repo/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { withPermission } from "@/lib/rbac";
import { trackFeature } from "@/lib/track-feature";

// ─── GET /api/keys ──────────────────────────────────────────────────────────

export const GET = withPermission("keys", "read")(async (request, { db, orgId }) => {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search") || "";
    const locationId = url.searchParams.get("locationId");
    const offset = (page - 1) * limit;

    const conditions = [
      eq(keys.organizationId, orgId),
      eq(keys.isActive, true),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(keys.name, `%${search}%`),
          ilike(keys.number, `%${search}%`),
          ilike(keys.barcode, `%${search}%`)
        )!
      );
    }
    if (locationId) {
      conditions.push(
        or(eq(keys.homeLocationId, locationId), eq(keys.assignedLocationId, locationId))!
      );
    }

    const homeLocation = alias(locations, "home_location");
    const assignedLocation = alias(locations, "assigned_location");

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: keys.id,
          number: keys.number,
          name: keys.name,
          address: keys.address,
          quantity: keys.quantity,
          homeLocationId: keys.homeLocationId,
          homeLocationName: homeLocation.name,
          assignedToId: keys.assignedToId,
          assignedToName: users.name,
          assignedLocationId: keys.assignedLocationId,
          assignedLocationName: assignedLocation.name,
          barcode: keys.barcode,
          image: keys.image,
          notes: keys.notes,
          status: keys.status,
          isActive: keys.isActive,
          createdAt: keys.createdAt,
          updatedAt: keys.updatedAt,
        })
        .from(keys)
        .leftJoin(homeLocation, eq(keys.homeLocationId, homeLocation.id))
        .leftJoin(assignedLocation, eq(keys.assignedLocationId, assignedLocation.id))
        .leftJoin(users, eq(keys.assignedToId, users.id))
        .where(and(...conditions))
        .orderBy(keys.name)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(keys)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/keys error:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
});

// ─── POST /api/keys ─────────────────────────────────────────────────────────

export const POST = withPermission("keys", "create")(async (request, { db, orgId }) => {
  try {
    const body = await request.json();
    const {
      number,
      name,
      address,
      quantity,
      homeLocationId,
      assignedToId,
      barcode,
      image,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [key] = await db
      .insert(keys)
      .values({
        organizationId: orgId,
        number,
        name,
        address,
        quantity,
        homeLocationId,
        assignedToId,
        barcode,
        image,
        notes,
      })
      .returning();

    trackFeature(db, orgId, "keys");
    return NextResponse.json(key, { status: 201 });
  } catch (error) {
    console.error("POST /api/keys error:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
});
