import { getDb } from "@repo/db";
import {
  materials,
  materialStocks,
  orders,
  orderItems,
  suppliers,
} from "@repo/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { findBestPrice } from "./best-price";

export interface AutoReorderResult {
  ordersCreated: number;
  itemsOrdered: number;
  details: Array<{
    materialId: string;
    materialName: string;
    supplierId: string;
    supplierName: string;
    quantity: number;
    unitPrice: number;
  }>;
  skipped: Array<{
    materialId: string;
    materialName: string;
    reason: string;
  }>;
}

/**
 * Checks all materials below reorderLevel for an org and creates draft
 * purchase orders grouped by supplier.
 *
 * Target quantity = reorderLevel * targetMultiplier (default 2).
 */
export async function checkAndCreateReorders(
  orgId: string,
  targetMultiplier = 2
): Promise<AutoReorderResult> {
  const db = getDb();

  // Find all active materials where per-location stock <= reorderLevel.
  // We use the same join pattern as check-low-stock.ts (proven working).
  // Note: this may return duplicate materialId rows when stock spans multiple
  // locations — we deduplicate below using a Map.
  const lowStockRows = await db
    .select({
      id: materials.id,
      name: materials.name,
      unit: materials.unit,
      reorderLevel: materials.reorderLevel,
      stockQty: materialStocks.quantity,
    })
    .from(materials)
    .innerJoin(materialStocks, eq(materials.id, materialStocks.materialId))
    .where(
      and(
        eq(materials.organizationId, orgId),
        eq(materials.isActive, true),
        isNotNull(materials.reorderLevel),
        sql`${materialStocks.quantity} <= ${materials.reorderLevel}`
      )
    )
    .limit(200);

  // Deduplicate: aggregate total stock per material
  const matMap = new Map<string, { id: string; name: string; unit: string; reorderLevel: number; totalStock: number }>();
  for (const row of lowStockRows) {
    if (!matMap.has(row.id)) {
      matMap.set(row.id, {
        id: row.id,
        name: row.name,
        unit: row.unit ?? "Stk",
        reorderLevel: row.reorderLevel ?? 0,
        totalStock: 0,
      });
    }
    matMap.get(row.id)!.totalStock += row.stockQty ?? 0;
  }
  const lowStockMaterials = Array.from(matMap.values()).filter(
    (m) => m.reorderLevel > 0 && m.totalStock <= m.reorderLevel
  );

  if (lowStockMaterials.length === 0) {
    return { ordersCreated: 0, itemsOrdered: 0, details: [], skipped: [] };
  }

  // Map materialId → best price result
  const orderMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      items: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
        unitPrice: number;
      }>;
    }
  >();

  const skipped: AutoReorderResult["skipped"] = [];
  const details: AutoReorderResult["details"] = [];

  for (const mat of lowStockMaterials) {
    const reorderLevel = mat.reorderLevel ?? 0;
    const targetQty = Math.max(1, reorderLevel * targetMultiplier);
    const orderQty = Math.max(1, targetQty - mat.totalStock);

    const best = await findBestPrice(mat.id, orgId, orderQty);

    if (!best) {
      skipped.push({
        materialId: mat.id,
        materialName: mat.name,
        reason: "Kein Lieferant mit aktivem Preis und ausreichender Mindestbestellmenge",
      });
      continue;
    }

    if (!orderMap.has(best.supplierId)) {
      orderMap.set(best.supplierId, {
        supplierId: best.supplierId,
        supplierName: best.supplierName,
        items: [],
      });
    }

    orderMap.get(best.supplierId)!.items.push({
      materialId: mat.id,
      materialName: mat.name,
      quantity: orderQty,
      unitPrice: best.unitPrice,
    });

    details.push({
      materialId: mat.id,
      materialName: mat.name,
      supplierId: best.supplierId,
      supplierName: best.supplierName,
      quantity: orderQty,
      unitPrice: best.unitPrice,
    });
  }

  // Create one draft order per supplier
  let ordersCreated = 0;
  let itemsOrdered = 0;

  for (const [supplierId, group] of orderMap) {
    // Verify supplier exists (safety check)
    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, orgId)))
      .limit(1);

    if (!supplier) continue;

    const totalAmount = group.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Generate order number: AUTO-YYYY-MM-DD-<random>
    const today = new Date().toISOString().split("T")[0]!;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderNumber = `AUTO-${today}-${rand}`;

    const [newOrder] = await db
      .insert(orders)
      .values({
        organizationId: orgId,
        supplierId,
        orderNumber,
        status: "draft",
        orderDate: today,
        totalAmount,
        currency: "CHF",
        notes: `Automatische Nachbestellung (Meldebestand unterschritten) – ${new Date().toLocaleDateString("de-CH")}`,
      })
      .returning();

    if (!newOrder) continue;

    await db.insert(orderItems).values(
      group.items.map((item) => ({
        orderId: newOrder.id,
        materialId: item.materialId,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitPrice: item.unitPrice,
        currency: "CHF",
      }))
    );

    ordersCreated++;
    itemsOrdered += group.items.length;
  }

  return { ordersCreated, itemsOrdered, details, skipped };
}
