import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { commissions, locations, customers, users } from "@repo/db/schema";
import { eq, and, inArray, desc, sql, count, aliasedTable } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const statusParam = url.searchParams.getAll("status");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const conditions = [eq(commissions.organizationId, orgId)];
    if (statusParam.length > 0) {
      conditions.push(inArray(commissions.status, statusParam));
    }

    const vehicleLocations = aliasedTable(locations, "vehicle_locations");

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: commissions.id,
          name: commissions.name,
          number: commissions.number,
          manualNumber: commissions.manualNumber,
          status: commissions.status,
          notes: commissions.notes,
          targetLocationId: commissions.targetLocationId,
          targetLocationName: locations.name,
          customerId: commissions.customerId,
          customerName: customers.name,
          responsibleId: commissions.responsibleId,
          responsibleName: users.name,
          vehicleId: commissions.vehicleId,
          vehicleName: vehicleLocations.name,
          entryCount: sql<number>`(
            SELECT COUNT(*) FROM commission_entries ce
            WHERE ce.commission_id = ${commissions.id}
          )`,
          createdAt: commissions.createdAt,
          updatedAt: commissions.updatedAt,
        })
        .from(commissions)
        .leftJoin(locations, eq(commissions.targetLocationId, locations.id))
        .leftJoin(customers, eq(commissions.customerId, customers.id))
        .leftJoin(users, eq(commissions.responsibleId, users.id))
        .leftJoin(vehicleLocations, eq(commissions.vehicleId, vehicleLocations.id))
        .where(and(...conditions))
        .orderBy(desc(commissions.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: count() })
        .from(commissions)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.total ?? 0),
        totalPages: Math.ceil(Number(countResult[0]?.total ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/commissions error:", error);
    return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { name, targetLocationId, customerId, vehicleId, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Auto-increment number per org using a subquery to reduce (but not fully prevent) races.
    // Duplicates are benign UX-wise (manual number overrides are available) but adding a
    // unique constraint on (organizationId, number) in a future migration would make this safe.
    const [commission] = await db
      .insert(commissions)
      .values({
        organizationId: orgId,
        name,
        number: sql<number>`(
          SELECT COALESCE(MAX(number), 0) + 1
          FROM commissions
          WHERE organization_id = ${orgId}
        )`,
        targetLocationId: targetLocationId ?? null,
        customerId: customerId ?? null,
        vehicleId: vehicleId ?? null,
        responsibleId: session.user.id,
        notes: notes ?? null,
        status: "open",
      })
      .returning();

    return NextResponse.json(commission, { status: 201 });
  } catch (error) {
    console.error("POST /api/commissions error:", error);
    return NextResponse.json({ error: "Failed to create commission" }, { status: 500 });
  }
}
