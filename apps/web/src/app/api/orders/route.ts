import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { orders, orderItems, suppliers } from "@repo/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { trackFeature } from "@/lib/track-feature";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.organizationId, orgId)];
    if (status && status !== "all") {
      conditions.push(eq(orders.status, status));
    }

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          ownOrderNumber: orders.ownOrderNumber,
          status: orders.status,
          orderDate: orders.orderDate,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          notes: orders.notes,
          documentUrl: orders.documentUrl,
          supplierId: orders.supplierId,
          supplierName: suppliers.name,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
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
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
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
      supplierId,
      orderNumber,
      notes,
      orderDate,
      items: positions,
      requestId,
    } = body;

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId is required" },
        { status: 400 }
      );
    }

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json(
        { error: "At least one order item is required" },
        { status: 400 }
      );
    }

    // Create the order
    const [order] = await db
      .insert(orders)
      .values({
        organizationId: orgId,
        supplierId,
        orderNumber: orderNumber || null,
        status: "ordered",
        orderDate: orderDate || new Date().toISOString().split("T")[0],
        notes: notes || null,
      })
      .returning();

    // Create order items
    const itemValues = positions.map(
      (item: { materialId: string; quantity: number; unitPrice?: number }) => ({
        orderId: order.id,
        materialId: item.materialId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? null,
      })
    );

    await db.insert(orderItems).values(itemValues);

    // If this was created from a material request, we could update the request status here
    // For now we just return the order with the requestId for the client to handle
    trackFeature(db, orgId, "orders");
    return NextResponse.json({ ...order, requestId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
