import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { supplierPrices } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/supplier-prices/[id]
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
      .select()
      .from(supplierPrices)
      .where(and(eq(supplierPrices.id, id), eq(supplierPrices.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Preis nicht gefunden" }, { status: 404 });
    }

    const body = await request.json() as {
      unitPrice?: number;
      currency?: string;
      minOrderQuantity?: number;
      leadTimeDays?: number | null;
      validFrom?: string | null;
      validTo?: string | null;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.unitPrice !== undefined) {
      if (typeof body.unitPrice !== "number" || body.unitPrice < 0) {
        return NextResponse.json(
          { error: "unitPrice muss eine positive Zahl in Rappen sein" },
          { status: 400 }
        );
      }
      updates.unitPrice = Math.round(body.unitPrice);
    }
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.minOrderQuantity !== undefined) updates.minOrderQuantity = body.minOrderQuantity;
    if (body.leadTimeDays !== undefined) updates.leadTimeDays = body.leadTimeDays;
    if (body.validFrom !== undefined) updates.validFrom = body.validFrom ? new Date(body.validFrom) : null;
    if (body.validTo !== undefined) updates.validTo = body.validTo ? new Date(body.validTo) : null;

    const [updated] = await db
      .update(supplierPrices)
      .set(updates)
      .where(eq(supplierPrices.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/supplier-prices/[id] error:", error);
    return NextResponse.json(
      { error: "Preis konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}

// DELETE /api/supplier-prices/[id]
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
      .select({ id: supplierPrices.id })
      .from(supplierPrices)
      .where(and(eq(supplierPrices.id, id), eq(supplierPrices.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Preis nicht gefunden" }, { status: 404 });
    }

    await db.delete(supplierPrices).where(eq(supplierPrices.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/supplier-prices/[id] error:", error);
    return NextResponse.json(
      { error: "Preis konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
