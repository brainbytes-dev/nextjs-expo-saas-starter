import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { commissions, commissionEntries, materials, tools } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commissionId } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Verify commission belongs to org
    const [commission] = await db
      .select({ id: commissions.id })
      .from(commissions)
      .where(and(eq(commissions.id, commissionId), eq(commissions.organizationId, orgId)))
      .limit(1);

    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    const entries = await db
      .select({
        id: commissionEntries.id,
        commissionId: commissionEntries.commissionId,
        materialId: commissionEntries.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        materialUnit: materials.unit,
        toolId: commissionEntries.toolId,
        toolName: tools.name,
        toolNumber: tools.number,
        quantity: commissionEntries.quantity,
        pickedQuantity: commissionEntries.pickedQuantity,
        status: commissionEntries.status,
        notes: commissionEntries.notes,
        createdAt: commissionEntries.createdAt,
      })
      .from(commissionEntries)
      .leftJoin(materials, eq(commissionEntries.materialId, materials.id))
      .leftJoin(tools, eq(commissionEntries.toolId, tools.id))
      .where(eq(commissionEntries.commissionId, commissionId))
      .orderBy(commissionEntries.createdAt);

    return NextResponse.json({ data: entries });
  } catch (error) {
    console.error("GET /api/commissions/[id]/entries error:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commissionId } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Verify commission belongs to org
    const [commission] = await db
      .select({ id: commissions.id, status: commissions.status })
      .from(commissions)
      .where(and(eq(commissions.id, commissionId), eq(commissions.organizationId, orgId)))
      .limit(1);

    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    if (commission.status === "completed" || commission.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot add entries to a completed or cancelled commission" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { materialId, toolId, quantity, notes } = body;

    if (!materialId && !toolId) {
      return NextResponse.json(
        { error: "Either materialId or toolId is required" },
        { status: 400 }
      );
    }
    if (materialId && toolId) {
      return NextResponse.json(
        { error: "Provide either materialId or toolId, not both" },
        { status: 400 }
      );
    }

    const qty = Math.max(1, parseInt(quantity ?? "1"));

    const [entry] = await db
      .insert(commissionEntries)
      .values({
        organizationId: orgId,
        commissionId,
        materialId: materialId ?? null,
        toolId: toolId ?? null,
        quantity: qty,
        pickedQuantity: 0,
        status: "open",
        notes: notes ?? null,
      })
      .returning();

    // Auto-advance commission to in_progress when first entry is added
    if (commission.status === "open") {
      await db
        .update(commissions)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(commissions.id, commissionId));
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/commissions/[id]/entries error:", error);
    return NextResponse.json({ error: "Failed to add entry" }, { status: 500 });
  }
}
