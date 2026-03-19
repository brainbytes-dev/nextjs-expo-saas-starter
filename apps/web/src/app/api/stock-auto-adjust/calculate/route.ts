import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockAutoAdjustSettings,
  materials,
  materialStocks,
  stockChanges,
  supplierPrices,
} from "@repo/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";

// ─── POST /api/stock-auto-adjust/calculate ──────────────────────────────────
// Calculate recommended min/max for a single material
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = (await request.json()) as {
      materialId: string;
      lookbackDays?: number;
      safetyFactor?: number; // integer percentage (150 = 1.5x)
      leadTimeDays?: number;
      applyImmediately?: boolean;
    };

    if (!body.materialId) {
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    // Verify material belongs to org
    const [mat] = await db
      .select({ id: materials.id, name: materials.name })
      .from(materials)
      .where(
        and(
          eq(materials.id, body.materialId),
          eq(materials.organizationId, orgId)
        )
      )
      .limit(1);

    if (!mat) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const lookbackDays = Math.max(7, Math.min(365, body.lookbackDays ?? 90));
    const safetyFactor = Math.max(100, Math.min(500, body.safetyFactor ?? 150));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

    // 1. Query stockChanges where changeType = 'out' within lookback window
    const outChanges = await db
      .select({
        totalOut: sql<number>`COALESCE(SUM(ABS(${stockChanges.quantity})), 0)`,
        changeCount: sql<number>`COUNT(*)`,
      })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          eq(stockChanges.materialId, body.materialId),
          eq(stockChanges.changeType, "out"),
          gte(stockChanges.createdAt, cutoffDate)
        )
      );

    const totalOut = Number(outChanges[0]?.totalOut ?? 0);
    const changeCount = Number(outChanges[0]?.changeCount ?? 0);
    const actualDays = Math.max(
      1,
      Math.ceil(
        (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // 2. Average daily consumption
    const avgDailyConsumption = totalOut / actualDays;

    // 3. Get leadTimeDays from supplierPrices (fallback to body param or 7)
    let leadTimeDays = body.leadTimeDays ?? null;
    if (leadTimeDays === null) {
      const [supplierPrice] = await db
        .select({ leadTimeDays: supplierPrices.leadTimeDays })
        .from(supplierPrices)
        .where(
          and(
            eq(supplierPrices.organizationId, orgId),
            eq(supplierPrices.materialId, body.materialId)
          )
        )
        .orderBy(desc(supplierPrices.updatedAt))
        .limit(1);

      leadTimeDays = supplierPrice?.leadTimeDays ?? 7;
    }

    // 4. Calculate min/max/reorder point
    const zeroConsumption = avgDailyConsumption === 0;
    const calculatedMin = zeroConsumption
      ? 0
      : Math.ceil(avgDailyConsumption * leadTimeDays * (safetyFactor / 100));
    const calculatedMax = calculatedMin * 2;
    const calculatedReorderPoint = zeroConsumption
      ? 0
      : calculatedMin + Math.ceil(avgDailyConsumption * leadTimeDays);

    // 5. Update stockAutoAdjustSettings with results
    const [existingSetting] = await db
      .select({ id: stockAutoAdjustSettings.id })
      .from(stockAutoAdjustSettings)
      .where(
        and(
          eq(stockAutoAdjustSettings.organizationId, orgId),
          eq(stockAutoAdjustSettings.materialId, body.materialId)
        )
      )
      .limit(1);

    if (existingSetting) {
      await db
        .update(stockAutoAdjustSettings)
        .set({
          calculatedMin,
          calculatedMax,
          calculatedReorderPoint,
          lastCalculatedAt: new Date(),
          lookbackDays,
          safetyFactor,
          updatedAt: new Date(),
        })
        .where(eq(stockAutoAdjustSettings.id, existingSetting.id));
    } else {
      // Create a new setting row (enabled by default)
      await db.insert(stockAutoAdjustSettings).values({
        organizationId: orgId,
        materialId: body.materialId,
        enabled: true,
        algorithm: "moving_average",
        lookbackDays,
        safetyFactor,
        calculatedMin,
        calculatedMax,
        calculatedReorderPoint,
        lastCalculatedAt: new Date(),
      });
    }

    // 6. If applyImmediately, update materialStocks.minStock/maxStock
    if (body.applyImmediately && !zeroConsumption) {
      await db
        .update(materialStocks)
        .set({
          minStock: calculatedMin,
          maxStock: calculatedMax,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(materialStocks.organizationId, orgId),
            eq(materialStocks.materialId, body.materialId)
          )
        );
    }

    return NextResponse.json({
      materialId: body.materialId,
      materialName: mat.name,
      lookbackDays,
      safetyFactor,
      leadTimeDays,
      avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
      totalOutQuantity: totalOut,
      outboundTransactions: changeCount,
      actualDaysAnalyzed: actualDays,
      calculatedMin,
      calculatedMax,
      calculatedReorderPoint,
      zeroConsumption,
      appliedImmediately: body.applyImmediately && !zeroConsumption,
    });
  } catch (error) {
    console.error("POST /api/stock-auto-adjust/calculate error:", error);
    return NextResponse.json(
      { error: "Failed to calculate stock levels" },
      { status: 500 }
    );
  }
}
