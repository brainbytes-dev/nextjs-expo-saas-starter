import { NextResponse } from "next/server";
import { validateApiKey, hasScope } from "@/lib/api-key-auth";
import { materials, materialGroups, locations } from "@repo/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { getDb } from "@repo/db";

// ─── GET /api/v1/materials ────────────────────────────────────────────────────
// Public API — authenticated via Bearer API key with scope "materials:read".

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Ungültiger oder fehlender API-Schlüssel" },
      { status: 401 }
    );
  }

  if (!hasScope(auth.scopes, "materials:read")) {
    return NextResponse.json(
      { error: "API-Schlüssel hat nicht den Scope 'materials:read'" },
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
    const offset = (page - 1) * limit;

    const conditions = [
      eq(materials.organizationId, auth.orgId),
      eq(materials.isActive, true),
    ];

    if (search) conditions.push(ilike(materials.name, `%${search}%`));
    if (groupId) conditions.push(eq(materials.groupId, groupId));

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: materials.id,
          number: materials.number,
          name: materials.name,
          groupId: materials.groupId,
          groupName: materialGroups.name,
          mainLocationId: materials.mainLocationId,
          mainLocationName: locations.name,
          unit: materials.unit,
          barcode: materials.barcode,
          manufacturer: materials.manufacturer,
          reorderLevel: materials.reorderLevel,
          createdAt: materials.createdAt,
          updatedAt: materials.updatedAt,
          totalStock: sql<number>`COALESCE((
            SELECT SUM(ms.quantity)
            FROM material_stocks ms
            WHERE ms.material_id = ${materials.id}
          ), 0)`.as("total_stock"),
        })
        .from(materials)
        .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
        .leftJoin(locations, eq(materials.mainLocationId, locations.id))
        .where(and(...conditions))
        .orderBy(materials.name)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(materials)
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
    console.error("GET /api/v1/materials error:", error);
    return NextResponse.json({ error: "Fehler beim Abrufen der Materialien" }, { status: 500 });
  }
}
