import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { suppliers } from "@repo/db/schema";
import { eq, ilike, and, sql } from "drizzle-orm";
import { trackFeature } from "@/lib/track-feature";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const conditions = [eq(suppliers.organizationId, orgId)];
    if (search) {
      conditions.push(ilike(suppliers.name, `%${search}%`));
    }

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(suppliers.name)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(suppliers)
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
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
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
      name,
      supplierNumber,
      customerNumber,
      contactPerson,
      email,
      phone,
      address,
      zip,
      city,
      country,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const [supplier] = await db
      .insert(suppliers)
      .values({
        organizationId: orgId,
        name,
        supplierNumber,
        customerNumber,
        contactPerson,
        email,
        phone,
        address,
        zip,
        city,
        country,
        notes,
      })
      .returning();

    trackFeature(db, orgId, "suppliers");
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("POST /api/suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
