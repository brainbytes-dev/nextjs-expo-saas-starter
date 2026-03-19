import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  stockChanges,
  materials,
  projects,
  supplierPrices,
} from "@repo/db/schema";
import { eq, and, gte, lte, isNotNull, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/reports/cost-centers
//
// Query params:
//   from   — ISO date string, start of range (inclusive)
//   to     — ISO date string, end of range (inclusive)
//
// Returns aggregated material-out costs per project/cost center.
// Unit price is resolved from the cheapest active supplier price for the
// material; falls back to 0 when no price is on record.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // Build date-range conditions on createdAt
    const conditions = [
      eq(stockChanges.organizationId, orgId),
      isNotNull(stockChanges.projectId),
    ];
    if (fromParam) {
      conditions.push(gte(stockChanges.createdAt, new Date(fromParam)));
    }
    if (toParam) {
      const toEnd = new Date(toParam);
      toEnd.setHours(23, 59, 59, 999);
      conditions.push(lte(stockChanges.createdAt, toEnd));
    }

    // Fetch all stock changes that have a project attached
    const rows = await db
      .select({
        changeId: stockChanges.id,
        changeType: stockChanges.changeType,
        quantity: stockChanges.quantity,
        materialId: stockChanges.materialId,
        materialName: materials.name,
        materialNumber: materials.number,
        materialUnit: materials.unit,
        projectId: projects.id,
        projectName: projects.name,
        projectCostCenter: projects.costCenter,
        projectNumber: projects.projectNumber,
        createdAt: stockChanges.createdAt,
      })
      .from(stockChanges)
      .leftJoin(materials, eq(stockChanges.materialId, materials.id))
      .leftJoin(projects, eq(stockChanges.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(stockChanges.createdAt))
      .limit(10000);

    // Collect unique material IDs so we can batch-fetch prices once
    const materialIds = [...new Set(rows.map((r) => r.materialId).filter(Boolean))] as string[];

    // Fetch cheapest supplier price per material (in cents)
    const priceRows =
      materialIds.length > 0
        ? await db
            .select({
              materialId: supplierPrices.materialId,
              unitPrice: supplierPrices.unitPrice, // cents
            })
            .from(supplierPrices)
            .where(
              and(
                eq(supplierPrices.organizationId, orgId),
              )
            )
            .orderBy(supplierPrices.unitPrice)
        : [];

    // materialId → cheapest unit price in CHF
    const priceMap = new Map<string, number>();
    for (const p of priceRows) {
      if (!priceMap.has(p.materialId) && p.unitPrice != null) {
        priceMap.set(p.materialId, p.unitPrice / 100);
      }
    }

    // Build per-project / per-material breakdown
    type LineItem = {
      projectId: string;
      projectName: string;
      costCenter: string | null;
      projectNumber: string | null;
      materialId: string;
      materialName: string;
      materialNumber: string | null;
      unit: string | null;
      totalQty: number;
      unitPrice: number;
      totalCost: number;
    };

    const lineMap = new Map<string, LineItem>();

    for (const r of rows) {
      if (!r.projectId || !r.materialId) continue;

      // Only count outgoing quantities as cost (negative qty in DB for "out")
      const absQty = Math.abs(r.quantity ?? 0);

      const key = `${r.projectId}__${r.materialId}`;
      const existing = lineMap.get(key);
      const unitPrice = priceMap.get(r.materialId) ?? 0;

      if (existing) {
        existing.totalQty += absQty;
        existing.totalCost = existing.totalQty * existing.unitPrice;
      } else {
        lineMap.set(key, {
          projectId: r.projectId,
          projectName: r.projectName ?? "Unbekannt",
          costCenter: r.projectCostCenter ?? null,
          projectNumber: r.projectNumber ?? null,
          materialId: r.materialId,
          materialName: r.materialName ?? "Unbekannt",
          materialNumber: r.materialNumber ?? null,
          unit: r.materialUnit ?? null,
          totalQty: absQty,
          unitPrice,
          totalCost: absQty * unitPrice,
        });
      }
    }

    // Group by project, compute totals
    const projectMap = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        costCenter: string | null;
        projectNumber: string | null;
        totalCost: number;
        lines: LineItem[];
      }
    >();

    for (const line of lineMap.values()) {
      const existing = projectMap.get(line.projectId);
      if (existing) {
        existing.lines.push(line);
        existing.totalCost += line.totalCost;
      } else {
        projectMap.set(line.projectId, {
          projectId: line.projectId,
          projectName: line.projectName,
          costCenter: line.costCenter,
          projectNumber: line.projectNumber,
          totalCost: line.totalCost,
          lines: [line],
        });
      }
    }

    const projectGroups = [...projectMap.values()].sort(
      (a, b) => b.totalCost - a.totalCost
    );

    return NextResponse.json({ data: projectGroups });
  } catch (error) {
    console.error("GET /api/reports/cost-centers error:", error);
    return NextResponse.json(
      { error: "Failed to generate cost center report" },
      { status: 500 }
    );
  }
}
