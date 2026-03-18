import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { supplierPrices, suppliers, materials } from "@repo/db/schema";
import { eq, and, isNull, or, gte } from "drizzle-orm";

// GET /api/supplier-prices?materialId=xxx  OR  ?supplierId=xxx
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const materialId = url.searchParams.get("materialId");
    const supplierId = url.searchParams.get("supplierId");

    if (!materialId && !supplierId) {
      return NextResponse.json(
        { error: "materialId oder supplierId erforderlich" },
        { status: 400 }
      );
    }

    const now = new Date();

    const rows = await db
      .select({
        id: supplierPrices.id,
        supplierId: supplierPrices.supplierId,
        supplierName: suppliers.name,
        materialId: supplierPrices.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        unitPrice: supplierPrices.unitPrice,
        currency: supplierPrices.currency,
        minOrderQuantity: supplierPrices.minOrderQuantity,
        leadTimeDays: supplierPrices.leadTimeDays,
        validFrom: supplierPrices.validFrom,
        validTo: supplierPrices.validTo,
        createdAt: supplierPrices.createdAt,
        updatedAt: supplierPrices.updatedAt,
      })
      .from(supplierPrices)
      .innerJoin(suppliers, eq(supplierPrices.supplierId, suppliers.id))
      .innerJoin(materials, eq(supplierPrices.materialId, materials.id))
      .where(
        and(
          eq(supplierPrices.organizationId, orgId),
          materialId ? eq(supplierPrices.materialId, materialId) : undefined,
          supplierId ? eq(supplierPrices.supplierId, supplierId) : undefined,
          // Only return currently-valid prices (validTo null or in future)
          or(isNull(supplierPrices.validTo), gte(supplierPrices.validTo, now))
        )
      )
      .orderBy(supplierPrices.unitPrice);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/supplier-prices error:", error);
    return NextResponse.json(
      { error: "Preise konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// POST /api/supplier-prices
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json() as {
      supplierId: string;
      materialId: string;
      unitPrice: number;      // in cents
      currency?: string;
      minOrderQuantity?: number;
      leadTimeDays?: number | null;
      validFrom?: string | null;
      validTo?: string | null;
    };

    if (!body.supplierId || !body.materialId || body.unitPrice == null) {
      return NextResponse.json(
        { error: "supplierId, materialId und unitPrice sind erforderlich" },
        { status: 400 }
      );
    }

    if (typeof body.unitPrice !== "number" || body.unitPrice < 0) {
      return NextResponse.json(
        { error: "unitPrice muss eine positive Zahl in Rappen sein" },
        { status: 400 }
      );
    }

    // Verify supplier belongs to org
    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, body.supplierId), eq(suppliers.organizationId, orgId)))
      .limit(1);

    if (!supplier) {
      return NextResponse.json({ error: "Lieferant nicht gefunden" }, { status: 404 });
    }

    // Verify material belongs to org
    const [material] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.id, body.materialId), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!material) {
      return NextResponse.json({ error: "Material nicht gefunden" }, { status: 404 });
    }

    const [created] = await db
      .insert(supplierPrices)
      .values({
        organizationId: orgId,
        supplierId: body.supplierId,
        materialId: body.materialId,
        unitPrice: Math.round(body.unitPrice),
        currency: body.currency ?? "CHF",
        minOrderQuantity: body.minOrderQuantity ?? 1,
        leadTimeDays: body.leadTimeDays ?? null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validTo: body.validTo ? new Date(body.validTo) : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/supplier-prices error:", error);
    return NextResponse.json(
      { error: "Preis konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
