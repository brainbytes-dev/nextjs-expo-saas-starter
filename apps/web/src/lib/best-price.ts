import { getDb } from "@repo/db";
import { supplierPrices, suppliers } from "@repo/db/schema";
import { eq, and, lte, isNull, or, gte } from "drizzle-orm";

export interface BestPriceResult {
  supplierPriceId: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;      // in cents
  totalPrice: number;     // in cents
  leadTimeDays: number | null;
  minOrderQuantity: number;
}

/**
 * Finds the cheapest active supplier price for a material that satisfies
 * the minimum order quantity for the requested amount.
 *
 * Prices are stored in cents. Returns null if no eligible price is found.
 */
export async function findBestPrice(
  materialId: string,
  orgId: string,
  quantity: number,
  preferredSupplierId?: string
): Promise<BestPriceResult | null> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({
      id: supplierPrices.id,
      supplierId: supplierPrices.supplierId,
      supplierName: suppliers.name,
      unitPrice: supplierPrices.unitPrice,
      minOrderQuantity: supplierPrices.minOrderQuantity,
      leadTimeDays: supplierPrices.leadTimeDays,
    })
    .from(supplierPrices)
    .innerJoin(suppliers, eq(supplierPrices.supplierId, suppliers.id))
    .where(
      and(
        eq(supplierPrices.organizationId, orgId),
        eq(supplierPrices.materialId, materialId),
        // Filter: minOrderQuantity <= requested quantity (NULL = no minimum)
        or(isNull(supplierPrices.minOrderQuantity), lte(supplierPrices.minOrderQuantity, quantity)),
        // Filter: price is currently valid
        or(isNull(supplierPrices.validTo), gte(supplierPrices.validTo, now)),
        // Optionally filter by specific supplier
        preferredSupplierId
          ? eq(supplierPrices.supplierId, preferredSupplierId)
          : undefined
      )
    )
    .orderBy(supplierPrices.unitPrice);

  if (rows.length === 0) return null;

  const best = rows[0]!;
  return {
    supplierPriceId: best.id,
    supplierId: best.supplierId,
    supplierName: best.supplierName,
    unitPrice: best.unitPrice,
    totalPrice: best.unitPrice * quantity,
    leadTimeDays: best.leadTimeDays,
    minOrderQuantity: best.minOrderQuantity ?? 1,
  };
}
