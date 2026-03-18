import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import {
  calculateLinearDepreciation,
  calculateDecliningDepreciation,
  getCurrentBookValue,
  calculateTCO,
} from "@/lib/depreciation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [tool] = await db
      .select({
        id: tools.id,
        name: tools.name,
        purchasePrice: tools.purchasePrice,
        purchaseDate: tools.purchaseDate,
        expectedLifeYears: tools.expectedLifeYears,
        salvageValue: tools.salvageValue,
        depreciationMethod: tools.depreciationMethod,
      })
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const purchasePriceCHF = tool.purchasePrice ? tool.purchasePrice / 100 : 0;
    const salvageValueCHF = tool.salvageValue ? tool.salvageValue / 100 : 0;
    const lifeYears = tool.expectedLifeYears ?? 0;
    const method = (tool.depreciationMethod as "linear" | "declining") ?? "linear";

    if (lifeYears <= 0 || purchasePriceCHF <= 0) {
      return NextResponse.json({
        purchasePrice: purchasePriceCHF,
        salvageValue: salvageValueCHF,
        lifeYears,
        method,
        currentBookValue: purchasePriceCHF,
        schedule: [],
        tco: calculateTCO({
          purchasePrice: purchasePriceCHF,
          purchaseDate: tool.purchaseDate,
          expectedLifeYears: lifeYears || null,
        }),
      });
    }

    const schedule =
      method === "declining"
        ? calculateDecliningDepreciation(purchasePriceCHF, salvageValueCHF, lifeYears)
        : calculateLinearDepreciation(purchasePriceCHF, salvageValueCHF, lifeYears);

    const currentBookValue = getCurrentBookValue(
      purchasePriceCHF,
      tool.purchaseDate,
      salvageValueCHF,
      lifeYears,
      method
    );

    const tco = calculateTCO({
      purchasePrice: purchasePriceCHF,
      purchaseDate: tool.purchaseDate,
      expectedLifeYears: lifeYears,
    });

    return NextResponse.json({
      purchasePrice: purchasePriceCHF,
      salvageValue: salvageValueCHF,
      lifeYears,
      method,
      purchaseDate: tool.purchaseDate,
      currentBookValue,
      schedule,
      tco,
    });
  } catch (error) {
    console.error("GET /api/tools/[id]/depreciation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch depreciation data" },
      { status: 500 }
    );
  }
}
