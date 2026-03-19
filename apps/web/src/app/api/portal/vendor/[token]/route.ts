import { NextResponse } from "next/server";
import { getDb } from "@repo/db";
import { vendorPortalTokens, suppliers, orders, orderItems, materials, organizations } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function validateVendorToken(token: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: vendorPortalTokens.id, organizationId: vendorPortalTokens.organizationId,
      supplierId: vendorPortalTokens.supplierId, email: vendorPortalTokens.email,
      isActive: vendorPortalTokens.isActive, expiresAt: vendorPortalTokens.expiresAt,
      supplierName: suppliers.name, orgName: organizations.name,
      orgLogo: organizations.logo, orgPrimaryColor: organizations.primaryColor,
    })
    .from(vendorPortalTokens)
    .innerJoin(suppliers, eq(vendorPortalTokens.supplierId, suppliers.id))
    .innerJoin(organizations, eq(vendorPortalTokens.organizationId, organizations.id))
    .where(eq(vendorPortalTokens.token, token))
    .limit(1);

  if (!row || !row.isActive) return null;
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;

  await db.update(vendorPortalTokens).set({ lastAccessedAt: new Date() }).where(eq(vendorPortalTokens.id, row.id));
  return { db, ...row };
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ctx = await validateVendorToken(token);
    if (!ctx) return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });

    const { db, supplierId, supplierName, orgName, orgLogo, orgPrimaryColor, organizationId } = ctx;

    const supplierOrders = await db
      .select({
        id: orders.id, orderNumber: orders.orderNumber, ownOrderNumber: orders.ownOrderNumber,
        status: orders.status, orderDate: orders.orderDate, totalAmount: orders.totalAmount,
        currency: orders.currency, notes: orders.notes,
      })
      .from(orders)
      .where(and(eq(orders.supplierId, supplierId), eq(orders.organizationId, organizationId)))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = [];
    for (const order of supplierOrders) {
      const items = await db
        .select({
          id: orderItems.id, materialName: materials.name, materialNumber: materials.number,
          quantity: orderItems.quantity, receivedQuantity: orderItems.receivedQuantity,
          unitPrice: orderItems.unitPrice, currency: orderItems.currency,
        })
        .from(orderItems)
        .innerJoin(materials, eq(orderItems.materialId, materials.id))
        .where(eq(orderItems.orderId, order.id));
      ordersWithItems.push({ ...order, items });
    }

    return NextResponse.json({
      supplier: { name: supplierName },
      org: { name: orgName, logo: orgLogo, primaryColor: orgPrimaryColor },
      orders: ordersWithItems,
    });
  } catch (error) {
    console.error("GET /api/portal/vendor/[token] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ctx = await validateVendorToken(token);
    if (!ctx) return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });

    const { db, supplierId, organizationId } = ctx;
    const body = await request.json();
    const { orderId, notes, status } = body;

    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const [order] = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.supplierId, supplierId), eq(orders.organizationId, organizationId)))
      .limit(1);

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (notes !== undefined) updateData.notes = notes;
    if (status === "confirmed") updateData.status = "ordered";

    await db.update(orders).set(updateData).where(eq(orders.id, orderId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/portal/vendor/[token] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
