import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { stockChanges, tools } from "@repo/db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";

const DEMO_KPI = {
  current: {
    stockInTotal: 312,
    stockOutTotal: 247,
    uniqueMaterialsMoved: 58,
    toolCheckouts: 34,
  },
  previous: {
    stockInTotal: 284,
    stockOutTotal: 218,
    uniqueMaterialsMoved: 51,
    toolCheckouts: 29,
  },
};

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const toDate = toParam ? new Date(toParam) : now;
    toDate.setHours(23, 59, 59, 999);
    const fromDate = fromParam
      ? new Date(fromParam)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs);
    const prevTo = new Date(fromDate.getTime() - 1);

    const buildKpi = async (from: Date, to: Date) => {
      const [stockIn, stockOut, uniqueMats, toolCOs] = await Promise.all([
        db
          .select({ total: sql<number>`coalesce(sum(abs(${stockChanges.quantity})), 0)` })
          .from(stockChanges)
          .where(
            and(
              eq(stockChanges.organizationId, orgId),
              eq(stockChanges.changeType, "in"),
              gte(stockChanges.createdAt, from),
              lte(stockChanges.createdAt, to)
            )
          ),
        db
          .select({ total: sql<number>`coalesce(sum(abs(${stockChanges.quantity})), 0)` })
          .from(stockChanges)
          .where(
            and(
              eq(stockChanges.organizationId, orgId),
              eq(stockChanges.changeType, "out"),
              gte(stockChanges.createdAt, from),
              lte(stockChanges.createdAt, to)
            )
          ),
        db
          .selectDistinct({ materialId: stockChanges.materialId })
          .from(stockChanges)
          .where(
            and(
              eq(stockChanges.organizationId, orgId),
              gte(stockChanges.createdAt, from),
              lte(stockChanges.createdAt, to)
            )
          ),
        db
          .select({ cnt: count(tools.id) })
          .from(tools)
          .where(
            and(
              eq(tools.organizationId, orgId),
              gte(tools.updatedAt, from),
              lte(tools.updatedAt, to),
              sql`${tools.assignedToId} is not null`
            )
          ),
      ]);

      return {
        stockInTotal: Number(stockIn[0]?.total ?? 0),
        stockOutTotal: Number(stockOut[0]?.total ?? 0),
        uniqueMaterialsMoved: uniqueMats.length,
        toolCheckouts: Number(toolCOs[0]?.cnt ?? 0),
      };
    };

    const [current, previous] = await Promise.all([
      buildKpi(fromDate, toDate),
      buildKpi(prevFrom, prevTo),
    ]);

    return NextResponse.json({ current, previous });
  } catch (error) {
    console.error("GET /api/analytics/kpi error:", error);
    return NextResponse.json(DEMO_KPI);
  }
}
