import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { deliveryTracking, orders, suppliers } from "@repo/db/schema";
import { eq, and, ilike, sql, or, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const supplierId = url.searchParams.get("supplierId") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "100")));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(deliveryTracking.organizationId, orgId),
    ];

    if (status) {
      conditions.push(eq(deliveryTracking.status, status));
    }
    if (supplierId) {
      conditions.push(eq(deliveryTracking.supplierId, supplierId));
    }

    const baseQuery = db
      .select({
        id: deliveryTracking.id,
        organizationId: deliveryTracking.organizationId,
        orderId: deliveryTracking.orderId,
        supplierId: deliveryTracking.supplierId,
        trackingNumber: deliveryTracking.trackingNumber,
        carrier: deliveryTracking.carrier,
        expectedDeliveryDate: deliveryTracking.expectedDeliveryDate,
        actualDeliveryDate: deliveryTracking.actualDeliveryDate,
        status: deliveryTracking.status,
        notes: deliveryTracking.notes,
        trackingUrl: deliveryTracking.trackingUrl,
        lastStatusUpdate: deliveryTracking.lastStatusUpdate,
        createdAt: deliveryTracking.createdAt,
        updatedAt: deliveryTracking.updatedAt,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        orderStatus: orders.status,
        supplierName: suppliers.name,
      })
      .from(deliveryTracking)
      .leftJoin(orders, eq(deliveryTracking.orderId, orders.id))
      .leftJoin(suppliers, eq(deliveryTracking.supplierId, suppliers.id));

    if (search) {
      conditions.push(
        or(
          ilike(orders.orderNumber, `%${search}%`),
          ilike(suppliers.name, `%${search}%`),
          ilike(deliveryTracking.trackingNumber, `%${search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [items, countResult] = await Promise.all([
      baseQuery
        .where(whereClause)
        .orderBy(desc(deliveryTracking.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(deliveryTracking)
        .where(and(eq(deliveryTracking.organizationId, orgId), ...(status ? [eq(deliveryTracking.status, status)] : []))),
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
    console.error("GET /api/deliveries error:", error);
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { orderId, supplierId, trackingNumber, carrier, expectedDeliveryDate, actualDeliveryDate, status, notes, trackingUrl } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const [order] = await db
      .select({ id: orders.id, supplierId: orders.supplierId })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, orgId)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const [delivery] = await db
      .insert(deliveryTracking)
      .values({
        organizationId: orgId,
        orderId,
        supplierId: supplierId || order.supplierId,
        trackingNumber: trackingNumber || null,
        carrier: carrier || null,
        expectedDeliveryDate: expectedDeliveryDate || null,
        actualDeliveryDate: actualDeliveryDate || null,
        status: status || "ordered",
        notes: notes || null,
        trackingUrl: trackingUrl || null,
        lastStatusUpdate: new Date(),
      })
      .returning();

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error("POST /api/deliveries error:", error);
    return NextResponse.json({ error: "Failed to create delivery" }, { status: 500 });
  }
}
