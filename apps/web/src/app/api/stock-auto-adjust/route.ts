import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockAutoAdjustSettings,
  materials,
  stockChanges,
  supplierPrices,
} from "@repo/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";

// ─── GET /api/stock-auto-adjust ──────────────────────────────────────────────
// List all auto-adjust settings for the org, joined with material + current stock info
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const rows = await db
      .select({
        id: stockAutoAdjustSettings.id,
        materialId: stockAutoAdjustSettings.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        unit: materials.unit,
        enabled: stockAutoAdjustSettings.enabled,
        algorithm: stockAutoAdjustSettings.algorithm,
        lookbackDays: stockAutoAdjustSettings.lookbackDays,
        safetyFactor: stockAutoAdjustSettings.safetyFactor,
        lastCalculatedAt: stockAutoAdjustSettings.lastCalculatedAt,
        calculatedMin: stockAutoAdjustSettings.calculatedMin,
        calculatedMax: stockAutoAdjustSettings.calculatedMax,
        calculatedReorderPoint: stockAutoAdjustSettings.calculatedReorderPoint,
        currentMinStock: sql<number | null>`(
          SELECT MIN(ms.min_stock)
          FROM material_stocks ms
          WHERE ms.material_id = ${stockAutoAdjustSettings.materialId}
            AND ms.min_stock IS NOT NULL
        )`.as("current_min_stock"),
        currentMaxStock: sql<number | null>`(
          SELECT MAX(ms.max_stock)
          FROM material_stocks ms
          WHERE ms.material_id = ${stockAutoAdjustSettings.materialId}
            AND ms.max_stock IS NOT NULL
        )`.as("current_max_stock"),
        currentStock: sql<number>`COALESCE((
          SELECT SUM(ms.quantity)
          FROM material_stocks ms
          WHERE ms.material_id = ${stockAutoAdjustSettings.materialId}
        ), 0)`.as("current_stock"),
        createdAt: stockAutoAdjustSettings.createdAt,
        updatedAt: stockAutoAdjustSettings.updatedAt,
      })
      .from(stockAutoAdjustSettings)
      .innerJoin(materials, eq(stockAutoAdjustSettings.materialId, materials.id))
      .where(eq(stockAutoAdjustSettings.organizationId, orgId))
      .orderBy(materials.name);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET /api/stock-auto-adjust error:", error);
    return NextResponse.json(
      { error: "Failed to fetch auto-adjust settings" },
      { status: 500 }
    );
  }
}

// ─── POST /api/stock-auto-adjust ─────────────────────────────────────────────
// Upsert a setting (enable/disable, configure lookbackDays, safetyFactor)
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = (await request.json()) as {
      materialId: string;
      enabled?: boolean;
      lookbackDays?: number;
      safetyFactor?: number; // integer percentage, e.g. 150 = 1.5x
      algorithm?: string;
    };

    if (!body.materialId) {
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    // Verify the material belongs to this org
    const [mat] = await db
      .select({ id: materials.id })
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

    const values = {
      organizationId: orgId,
      materialId: body.materialId,
      enabled: body.enabled ?? true,
      lookbackDays: body.lookbackDays
        ? Math.max(7, Math.min(365, body.lookbackDays))
        : 90,
      safetyFactor: body.safetyFactor
        ? Math.max(100, Math.min(500, body.safetyFactor))
        : 150,
      algorithm: body.algorithm ?? "moving_average",
      updatedAt: new Date(),
    };

    // Check if a row already exists for this material + org
    const [existing] = await db
      .select({ id: stockAutoAdjustSettings.id })
      .from(stockAutoAdjustSettings)
      .where(
        and(
          eq(stockAutoAdjustSettings.organizationId, orgId),
          eq(stockAutoAdjustSettings.materialId, body.materialId)
        )
      )
      .limit(1);

    let saved;
    if (existing) {
      [saved] = await db
        .update(stockAutoAdjustSettings)
        .set(values)
        .where(eq(stockAutoAdjustSettings.id, existing.id))
        .returning();
    } else {
      [saved] = await db
        .insert(stockAutoAdjustSettings)
        .values(values)
        .returning();
    }

    return NextResponse.json(saved);
  } catch (error) {
    console.error("POST /api/stock-auto-adjust error:", error);
    return NextResponse.json(
      { error: "Failed to save auto-adjust setting" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/stock-auto-adjust ──────────────────────────────────────────────
// Trigger recalculation for ALL enabled settings in the org
export async function PUT(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Get all enabled settings
    const settings = await db
      .select()
      .from(stockAutoAdjustSettings)
      .where(
        and(
          eq(stockAutoAdjustSettings.organizationId, orgId),
          eq(stockAutoAdjustSettings.enabled, true)
        )
      );

    if (settings.length === 0) {
      return NextResponse.json({
        message: "No enabled settings to recalculate",
        updated: 0,
      });
    }

    const results: Array<{
      materialId: string;
      calculatedMin: number;
      calculatedMax: number;
      calculatedReorderPoint: number;
      zeroConsumption: boolean;
    }> = [];

    for (const setting of settings) {
      const lookbackDays = setting.lookbackDays ?? 90;
      const safetyFactor = setting.safetyFactor ?? 150;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      // 1. Query outbound stock changes
      const outChanges = await db
        .select({
          totalOut: sql<number>`COALESCE(SUM(ABS(${stockChanges.quantity})), 0)`,
        })
        .from(stockChanges)
        .where(
          and(
            eq(stockChanges.organizationId, orgId),
            eq(stockChanges.materialId, setting.materialId),
            eq(stockChanges.changeType, "out"),
            gte(stockChanges.createdAt, cutoffDate)
          )
        );

      const totalOut = Number(outChanges[0]?.totalOut ?? 0);
      const actualDays = Math.max(
        1,
        Math.ceil(
          (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      const avgDailyConsumption = totalOut / actualDays;

      // 2. Get lead time from supplier prices (fallback 7 days)
      const [supplierPrice] = await db
        .select({ leadTimeDays: supplierPrices.leadTimeDays })
        .from(supplierPrices)
        .where(
          and(
            eq(supplierPrices.organizationId, orgId),
            eq(supplierPrices.materialId, setting.materialId)
          )
        )
        .orderBy(desc(supplierPrices.updatedAt))
        .limit(1);

      const leadTimeDays = supplierPrice?.leadTimeDays ?? 7;

      // 3. Calculate min/max/reorder point
      const zeroConsumption = avgDailyConsumption === 0;
      const calculatedMin = zeroConsumption
        ? 0
        : Math.ceil(avgDailyConsumption * leadTimeDays * (safetyFactor / 100));
      const calculatedMax = calculatedMin * 2;
      const calculatedReorderPoint = zeroConsumption
        ? 0
        : calculatedMin +
          Math.ceil(avgDailyConsumption * leadTimeDays);

      // 4. Update setting with results
      await db
        .update(stockAutoAdjustSettings)
        .set({
          calculatedMin,
          calculatedMax,
          calculatedReorderPoint,
          lastCalculatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockAutoAdjustSettings.id, setting.id));

      results.push({
        materialId: setting.materialId,
        calculatedMin,
        calculatedMax,
        calculatedReorderPoint,
        zeroConsumption,
      });
    }

    return NextResponse.json({
      message: `Recalculated ${results.length} settings`,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error("PUT /api/stock-auto-adjust error:", error);
    return NextResponse.json(
      { error: "Failed to recalculate" },
      { status: 500 }
    );
  }
}
