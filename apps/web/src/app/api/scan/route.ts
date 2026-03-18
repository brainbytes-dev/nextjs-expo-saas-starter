import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { materials, tools, keys, locations, materialStocks } from "@repo/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const barcode = new URL(request.url).searchParams.get("barcode");
    if (!barcode) {
      return NextResponse.json({ error: "barcode query param required" }, { status: 400 });
    }

    // Search all three tables in parallel
    const [materialHits, toolHits, keyHits] = await Promise.all([
      db
        .select({
          id: materials.id,
          number: materials.number,
          name: materials.name,
          unit: materials.unit,
          barcode: materials.barcode,
          image: materials.image,
          mainLocationId: materials.mainLocationId,
          mainLocationName: locations.name,
          reorderLevel: materials.reorderLevel,
          totalStock: sql<number>`COALESCE(SUM(${materialStocks.quantity}), 0)`,
        })
        .from(materials)
        .leftJoin(locations, eq(materials.mainLocationId, locations.id))
        .leftJoin(materialStocks, eq(materialStocks.materialId, materials.id))
        .where(
          and(
            eq(materials.organizationId, orgId),
            eq(materials.barcode, barcode),
            eq(materials.isActive, true)
          )
        )
        .groupBy(materials.id, locations.id)
        .limit(1),

      db
        .select({
          id: tools.id,
          number: tools.number,
          name: tools.name,
          barcode: tools.barcode,
          image: tools.image,
          condition: tools.condition,
          assignedToId: tools.assignedToId,
          assignedLocationId: tools.assignedLocationId,
          homeLocationId: tools.homeLocationId,
          serialNumber: tools.serialNumber,
        })
        .from(tools)
        .where(
          and(
            eq(tools.organizationId, orgId),
            eq(tools.barcode, barcode),
            eq(tools.isActive, true)
          )
        )
        .limit(1),

      db
        .select({
          id: keys.id,
          number: keys.number,
          name: keys.name,
          barcode: keys.barcode,
          quantity: keys.quantity,
          assignedToId: keys.assignedToId,
          homeLocationId: keys.homeLocationId,
          address: keys.address,
        })
        .from(keys)
        .where(
          and(
            eq(keys.organizationId, orgId),
            eq(keys.barcode, barcode),
            eq(keys.isActive, true)
          )
        )
        .limit(1),
    ]);

    if (materialHits.length > 0) {
      return NextResponse.json({ type: "material", item: materialHits[0] });
    }
    if (toolHits.length > 0) {
      return NextResponse.json({ type: "tool", item: toolHits[0] });
    }
    if (keyHits.length > 0) {
      return NextResponse.json({ type: "key", item: keyHits[0] });
    }

    return NextResponse.json({ type: null, item: null });
  } catch (error) {
    console.error("GET /api/scan error:", error);
    return NextResponse.json({ error: "Scan lookup failed" }, { status: 500 });
  }
}
