import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools, toolGroups, locations, users } from "@repo/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search") || "";
    const groupId = url.searchParams.get("groupId");
    const assignedToId = url.searchParams.get("assignedToId");
    const locationId = url.searchParams.get("locationId");
    const offset = (page - 1) * limit;

    const conditions = [
      eq(tools.organizationId, orgId),
      eq(tools.isActive, true),
    ];

    if (search) {
      conditions.push(ilike(tools.name, `%${search}%`));
    }
    if (groupId) {
      conditions.push(eq(tools.groupId, groupId));
    }
    if (assignedToId) {
      conditions.push(eq(tools.assignedToId, assignedToId));
    }
    if (locationId) {
      conditions.push(
        or(eq(tools.homeLocationId, locationId), eq(tools.assignedLocationId, locationId))!
      );
    }

    // Aliases for the two location joins (home vs assigned)
    const homeLocation = alias(locations, "home_location");
    const assignedLocation = alias(locations, "assigned_location");

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: tools.id,
          number: tools.number,
          name: tools.name,
          groupId: tools.groupId,
          groupName: toolGroups.name,
          homeLocationId: tools.homeLocationId,
          homeLocationName: homeLocation.name,
          assignedToId: tools.assignedToId,
          assignedUserName: users.name,
          assignedLocationId: tools.assignedLocationId,
          assignedLocationName: assignedLocation.name,
          barcode: tools.barcode,
          image: tools.image,
          manufacturer: tools.manufacturer,
          serialNumber: tools.serialNumber,
          condition: tools.condition,
          nextMaintenanceDate: tools.nextMaintenanceDate,
          isActive: tools.isActive,
          createdAt: tools.createdAt,
          updatedAt: tools.updatedAt,
        })
        .from(tools)
        .leftJoin(toolGroups, eq(tools.groupId, toolGroups.id))
        .leftJoin(homeLocation, eq(tools.homeLocationId, homeLocation.id))
        .leftJoin(assignedLocation, eq(tools.assignedLocationId, assignedLocation.id))
        .leftJoin(users, eq(tools.assignedToId, users.id))
        .where(and(...conditions))
        .orderBy(tools.name)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tools)
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
    console.error("GET /api/tools error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
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
    const {
      number,
      name,
      groupId,
      homeLocationId,
      assignedToId,
      assignedLocationId,
      barcode,
      image,
      manufacturer,
      manufacturerNumber,
      serialNumber,
      condition,
      maintenanceIntervalDays,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const [tool] = await db
      .insert(tools)
      .values({
        organizationId: orgId,
        number,
        name,
        groupId,
        homeLocationId,
        assignedToId,
        assignedLocationId,
        barcode,
        image,
        manufacturer,
        manufacturerNumber,
        serialNumber,
        condition,
        maintenanceIntervalDays,
        lastMaintenanceDate,
        nextMaintenanceDate,
        notes,
      })
      .returning();

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    console.error("POST /api/tools error:", error);
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}
