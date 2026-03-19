import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { deliveryTracking, orders, suppliers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [delivery] = await db
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
        supplierName: suppliers.name,
      })
      .from(deliveryTracking)
      .leftJoin(orders, eq(deliveryTracking.orderId, orders.id))
      .leftJoin(suppliers, eq(deliveryTracking.supplierId, suppliers.id))
      .where(and(eq(deliveryTracking.id, id), eq(deliveryTracking.organizationId, orgId)))
      .limit(1);

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("GET /api/deliveries/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch delivery" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [existing] = await db
      .select({ id: deliveryTracking.id, status: deliveryTracking.status })
      .from(deliveryTracking)
      .where(and(eq(deliveryTracking.id, id), eq(deliveryTracking.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    const body = await request.json();
    const { trackingNumber, carrier, expectedDeliveryDate, actualDeliveryDate, status, notes, trackingUrl } = body;
    const statusChanged = status !== undefined && status !== existing.status;

    const [updated] = await db
      .update(deliveryTracking)
      .set({
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(carrier !== undefined && { carrier }),
        ...(expectedDeliveryDate !== undefined && { expectedDeliveryDate }),
        ...(actualDeliveryDate !== undefined && { actualDeliveryDate }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(trackingUrl !== undefined && { trackingUrl }),
        ...(statusChanged && { lastStatusUpdate: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(deliveryTracking.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/deliveries/[id] error:", error);
    return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [existing] = await db
      .select({ id: deliveryTracking.id })
      .from(deliveryTracking)
      .where(and(eq(deliveryTracking.id, id), eq(deliveryTracking.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    await db.delete(deliveryTracking).where(eq(deliveryTracking.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deliveries/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete delivery" }, { status: 500 });
  }
}
