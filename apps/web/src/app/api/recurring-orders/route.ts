import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { recurringOrders, suppliers } from "@repo/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const items = await db
      .select({
        id: recurringOrders.id,
        name: recurringOrders.name,
        supplierId: recurringOrders.supplierId,
        supplierName: suppliers.name,
        items: recurringOrders.items,
        frequency: recurringOrders.frequency,
        dayOfWeek: recurringOrders.dayOfWeek,
        dayOfMonth: recurringOrders.dayOfMonth,
        nextRunAt: recurringOrders.nextRunAt,
        lastRunAt: recurringOrders.lastRunAt,
        isActive: recurringOrders.isActive,
        createdById: recurringOrders.createdById,
        createdAt: recurringOrders.createdAt,
        updatedAt: recurringOrders.updatedAt,
      })
      .from(recurringOrders)
      .leftJoin(suppliers, eq(recurringOrders.supplierId, suppliers.id))
      .where(eq(recurringOrders.organizationId, orgId))
      .orderBy(desc(recurringOrders.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/recurring-orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { name, supplierId, items, frequency, dayOfWeek, dayOfMonth } = body;

    if (!name || !supplierId || !items || !frequency) {
      return NextResponse.json(
        { error: "name, supplierId, items, and frequency are required" },
        { status: 400 }
      );
    }

    const validFrequencies = ["weekly", "biweekly", "monthly"];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `frequency must be one of: ${validFrequencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate next run date
    const nextRunAt = calculateNextRun(frequency, dayOfWeek, dayOfMonth);

    const [order] = await db
      .insert(recurringOrders)
      .values({
        organizationId: orgId,
        name,
        supplierId,
        items,
        frequency,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        nextRunAt,
        isActive: true,
        createdById: session.user.id,
      })
      .returning();

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring-orders error:", error);
    return NextResponse.json(
      { error: "Failed to create recurring order" },
      { status: 500 }
    );
  }
}

function calculateNextRun(
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const now = new Date();
  const next = new Date(now);

  if (frequency === "monthly") {
    const dom = dayOfMonth ?? 1;
    next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(dom, 28));
  } else if (frequency === "biweekly") {
    const targetDay = dayOfWeek ?? 1; // default Monday
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 14;
    else daysUntil += 7; // at least next occurrence
    next.setDate(now.getDate() + daysUntil);
  } else {
    // weekly
    const targetDay = dayOfWeek ?? 1;
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    next.setDate(now.getDate() + daysUntil);
  }

  next.setHours(8, 0, 0, 0);
  return next;
}
