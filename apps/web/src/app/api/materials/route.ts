import { NextResponse } from "next/server";
import { materials, materialGroups, locations, materialStocks } from "@repo/db/schema";
import { eq, and, ilike, sql, isNotNull, inArray, desc } from "drizzle-orm";
import { dispatchWebhook } from "@/lib/webhooks";
import { withPermission } from "@/lib/rbac";

// ─── GET /api/materials ───────────────────────────────────────────────────────
// Example of withPermission wrapper usage. Apply this pattern to other routes.

export const GET = withPermission("materials", "read")(async (request, { db, orgId }) => {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search") || "";
    const groupId = url.searchParams.get("groupId");
    const expiringOnly = url.searchParams.get("expiringOnly") === "true";
    const offset = (page - 1) * limit;

    const conditions = [
      eq(materials.organizationId, orgId),
      eq(materials.isActive, true),
    ];

    if (search) {
      conditions.push(ilike(materials.name, `%${search}%`));
    }
    if (groupId) {
      conditions.push(eq(materials.groupId, groupId));
    }
    if (expiringOnly) {
      // Filter to materials that have at least one stock entry with an expiryDate
      const stocksWithExpiry = await db
        .selectDistinct({ materialId: materialStocks.materialId })
        .from(materialStocks)
        .where(isNotNull(materialStocks.expiryDate));
      const ids = stocksWithExpiry.map((s) => s.materialId);
      if (ids.length > 0) {
        conditions.push(inArray(materials.id, ids));
      } else {
        // No expiring items at all — return empty
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }

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
          image: materials.image,
          manufacturer: materials.manufacturer,
          reorderLevel: materials.reorderLevel,
          isActive: materials.isActive,
          createdAt: materials.createdAt,
          updatedAt: materials.updatedAt,
          nearestExpiry: sql<string | null>`(
            SELECT MIN(ms.expiry_date)
            FROM material_stocks ms
            WHERE ms.material_id = ${materials.id}
              AND ms.expiry_date IS NOT NULL
              AND ms.quantity > 0
          )`.as("nearest_expiry"),
          totalStock: sql<number>`COALESCE((
            SELECT SUM(ms2.quantity)
            FROM material_stocks ms2
            WHERE ms2.material_id = ${materials.id}
          ), 0)`.as("total_stock"),
          cheapestPrice: sql<number | null>`(
            SELECT sp.unit_price
            FROM supplier_prices sp
            WHERE sp.material_id = ${materials.id}
              AND sp.organization_id = ${orgId}
            ORDER BY sp.unit_price ASC
            LIMIT 1
          )`.as("cheapest_price"),
          cheapestSupplierName: sql<string | null>`(
            SELECT s.name
            FROM supplier_prices sp
            JOIN suppliers s ON s.id = sp.supplier_id
            WHERE sp.material_id = ${materials.id}
              AND sp.organization_id = ${orgId}
            ORDER BY sp.unit_price ASC
            LIMIT 1
          )`.as("cheapest_supplier_name"),
          cheapestSupplierId: sql<string | null>`(
            SELECT sp.supplier_id
            FROM supplier_prices sp
            WHERE sp.material_id = ${materials.id}
              AND sp.organization_id = ${orgId}
            ORDER BY sp.unit_price ASC
            LIMIT 1
          )`.as("cheapest_supplier_id"),
        })
        .from(materials)
        .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
        .leftJoin(locations, eq(materials.mainLocationId, locations.id))
        .where(and(...conditions))
        .orderBy(desc(materials.createdAt))
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
    console.error("GET /api/materials error:", error);
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
});

// ─── POST /api/materials ──────────────────────────────────────────────────────

export const POST = withPermission("materials", "create")(async (request, { db, orgId }) => {
  try {
    const body = await request.json();
    const {
      number,
      name,
      groupId,
      mainLocationId,
      unit,
      barcode,
      image,
      manufacturer,
      manufacturerNumber,
      reorderLevel,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [material] = await db
      .insert(materials)
      .values({
        organizationId: orgId,
        number,
        name,
        groupId,
        mainLocationId,
        unit,
        barcode,
        image,
        manufacturer,
        manufacturerNumber,
        reorderLevel,
        notes,
      })
      .returning();

    // Dispatch webhook — fire-and-forget, does not affect response time
    dispatchWebhook(orgId, "material.created", {
      id: material.id,
      number: material.number,
      name: material.name,
      groupId: material.groupId,
      unit: material.unit,
      barcode: material.barcode,
      createdAt: material.createdAt,
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("POST /api/materials error:", error);
    return NextResponse.json({ error: "Failed to create material" }, { status: 500 });
  }
});

