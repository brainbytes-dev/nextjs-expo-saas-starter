import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { recurringOrders } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

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
      .select({ id: recurringOrders.id })
      .from(recurringOrders)
      .where(
        and(
          eq(recurringOrders.id, id),
          eq(recurringOrders.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring order not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, supplierId, items, frequency, dayOfWeek, dayOfMonth, isActive } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (items !== undefined) updateData.items = items;
    if (frequency !== undefined) {
      const validFrequencies = ["weekly", "biweekly", "monthly"];
      if (!validFrequencies.includes(frequency)) {
        return NextResponse.json(
          { error: `frequency must be one of: ${validFrequencies.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.frequency = frequency;
    }
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(recurringOrders)
      .set(updateData)
      .where(
        and(
          eq(recurringOrders.id, id),
          eq(recurringOrders.organizationId, orgId)
        )
      )
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/recurring-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update recurring order" },
      { status: 500 }
    );
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

    const [deleted] = await db
      .delete(recurringOrders)
      .where(
        and(
          eq(recurringOrders.id, id),
          eq(recurringOrders.organizationId, orgId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Recurring order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recurring-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete recurring order" },
      { status: 500 }
    );
  }
}
