import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { commissions, commissionEntries, locations, customers, users } from "@repo/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [commission] = await db
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
        createdAt: commissions.createdAt,
        updatedAt: commissions.updatedAt,
      })
      .from(commissions)
      .leftJoin(locations, eq(commissions.targetLocationId, locations.id))
      .leftJoin(customers, eq(commissions.customerId, customers.id))
      .leftJoin(users, eq(commissions.responsibleId, users.id))
      .where(and(eq(commissions.id, id), eq(commissions.organizationId, orgId)))
      .limit(1);

    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    const [entryCountRow] = await db
      .select({ total: count() })
      .from(commissionEntries)
      .where(eq(commissionEntries.commissionId, id));

    return NextResponse.json({ ...commission, entryCount: Number(entryCountRow?.total ?? 0) });
  } catch (error) {
    console.error("GET /api/commissions/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch commission" }, { status: 500 });
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
      .select({ id: commissions.id, status: commissions.status })
      .from(commissions)
      .where(and(eq(commissions.id, id), eq(commissions.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, name, notes, targetLocationId, customerId, signature, signedBy, signedAt } = body;

    const validStatuses = ["open", "in_progress", "ready", "completed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (notes !== undefined) updateData.notes = notes;
    if (targetLocationId !== undefined) updateData.targetLocationId = targetLocationId;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (signature !== undefined) updateData.signature = signature;
    if (signedBy !== undefined) updateData.signedBy = signedBy;
    if (signedAt !== undefined) updateData.signedAt = signedAt ? new Date(signedAt) : null;

    const [updated] = await db
      .update(commissions)
      .set(updateData)
      .where(and(eq(commissions.id, id), eq(commissions.organizationId, orgId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/commissions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update commission" }, { status: 500 });
  }
}
