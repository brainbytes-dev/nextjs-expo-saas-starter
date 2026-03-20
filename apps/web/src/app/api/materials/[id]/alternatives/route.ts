import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  materials,
  materialGroups,
  materialStocks,
} from "@repo/db/schema";
import { eq, and, ne, or, ilike, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // 1. Get the source material
    const [source] = await db
      .select({
        id: materials.id,
        name: materials.name,
        groupId: materials.groupId,
        unit: materials.unit,
      })
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.organizationId, orgId)))
      .limit(1);

    if (!source) {
      return NextResponse.json(
        { error: "Material nicht gefunden" },
        { status: 404 }
      );
    }

    // 2. Extract keywords from source name (words >= 3 chars)
    const keywords = source.name
      .split(/[\s\-_/.,;:()]+/)
      .filter((w) => w.length >= 3)
      .slice(0, 4); // max 4 keywords

    // 3. Build conditions: same group, similar name, or same unit
    const conditions: ReturnType<typeof eq>[] = [];

    if (source.groupId) {
      conditions.push(eq(materials.groupId, source.groupId));
    }

    for (const kw of keywords) {
      conditions.push(ilike(materials.name, `%${kw}%`));
    }

    if (source.unit) {
      conditions.push(eq(materials.unit, source.unit));
    }

    if (conditions.length === 0) {
      return NextResponse.json([]);
    }

    // 4. Query alternatives with stock aggregation
    const stockSum = db
      .select({
        materialId: materialStocks.materialId,
        totalStock: sql<number>`coalesce(sum(${materialStocks.quantity}), 0)`.as(
          "total_stock"
        ),
      })
      .from(materialStocks)
      .groupBy(materialStocks.materialId)
      .as("stock_agg");

    const alternatives = await db
      .select({
        id: materials.id,
        name: materials.name,
        number: materials.number,
        unit: materials.unit,
        groupId: materials.groupId,
        groupName: materialGroups.name,
        totalStock: sql<number>`coalesce(${stockSum.totalStock}, 0)`,
      })
      .from(materials)
      .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
      .leftJoin(stockSum, eq(materials.id, stockSum.materialId))
      .where(
        and(
          eq(materials.organizationId, orgId),
          eq(materials.isActive, true),
          ne(materials.id, id), // exclude self
          or(...conditions)
        )
      )
      .orderBy(
        // Same group first
        sql`CASE WHEN ${materials.groupId} = ${source.groupId ?? null} THEN 0 ELSE 1 END`,
        // Higher stock first
        sql`coalesce(${stockSum.totalStock}, 0) DESC`
      )
      .limit(5);

    return NextResponse.json(alternatives);
  } catch (error) {
    console.error("Material alternatives error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
