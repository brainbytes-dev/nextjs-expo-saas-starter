import { NextResponse } from "next/server";
import { validateApiKey, hasScope } from "@/lib/api-key-auth";
import { tools, toolGroups, locations, users } from "@repo/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { getDb } from "@repo/db";

// ─── GET /api/v1/tools ────────────────────────────────────────────────────────
// Public API — authenticated via Bearer API key with scope "tools:read".

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Ungültiger oder fehlender API-Schlüssel" },
      { status: 401 }
    );
  }

  if (!hasScope(auth.scopes, "tools:read")) {
    return NextResponse.json(
      { error: "API-Schlüssel hat nicht den Scope 'tools:read'" },
      { status: 403 }
    );
  }

  try {
    const db = getDb();
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search") || "";
    const groupId = url.searchParams.get("groupId");
    const assignedToId = url.searchParams.get("assignedToId");
    const offset = (page - 1) * limit;

    const conditions = [
      eq(tools.organizationId, auth.orgId),
      eq(tools.isActive, true),
    ];

    if (search) conditions.push(ilike(tools.name, `%${search}%`));
    if (groupId) conditions.push(eq(tools.groupId, groupId));
    if (assignedToId) conditions.push(eq(tools.assignedToId, assignedToId));

    const homeLocation = locations;

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
          barcode: tools.barcode,
          manufacturer: tools.manufacturer,
          serialNumber: tools.serialNumber,
          condition: tools.condition,
          nextMaintenanceDate: tools.nextMaintenanceDate,
          createdAt: tools.createdAt,
          updatedAt: tools.updatedAt,
        })
        .from(tools)
        .leftJoin(toolGroups, eq(tools.groupId, toolGroups.id))
        .leftJoin(homeLocation, eq(tools.homeLocationId, homeLocation.id))
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
    console.error("GET /api/v1/tools error:", error);
    return NextResponse.json({ error: "Fehler beim Abrufen der Werkzeuge" }, { status: 500 });
  }
}
