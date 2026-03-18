import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { materials, materialStocks, locations } from "@repo/db/schema";
import { eq, and, lte, isNotNull, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "30")));

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const rows = await db
      .select({
        stockId: materialStocks.id,
        materialId: materials.id,
        materialName: materials.name,
        materialNumber: materials.number,
        locationId: materialStocks.locationId,
        locationName: locations.name,
        expiryDate: materialStocks.expiryDate,
        quantity: materialStocks.quantity,
        batchNumber: materialStocks.batchNumber,
        unit: materials.unit,
      })
      .from(materialStocks)
      .innerJoin(materials, eq(materialStocks.materialId, materials.id))
      .leftJoin(locations, eq(materialStocks.locationId, locations.id))
      .where(
        and(
          eq(materialStocks.organizationId, orgId),
          eq(materials.isActive, true),
          isNotNull(materialStocks.expiryDate),
          lte(materialStocks.expiryDate, cutoffStr),
          sql`${materialStocks.quantity} > 0`
        )
      )
      .orderBy(materialStocks.expiryDate);

    const nowTime = now.getTime();
    const data = rows.map((row) => {
      const expiry = new Date(row.expiryDate!);
      const daysUntil = Math.floor(
        (expiry.getTime() - nowTime) / (1000 * 60 * 60 * 24)
      );
      return {
        stockId: row.stockId,
        materialId: row.materialId,
        materialName: row.materialName,
        materialNumber: row.materialNumber,
        locationId: row.locationId,
        locationName: row.locationName,
        expiryDate: row.expiryDate,
        quantity: row.quantity,
        batchNumber: row.batchNumber,
        unit: row.unit,
        daysUntil,
      };
    });

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("GET /api/materials/expiring error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expiring materials" },
      { status: 500 }
    );
  }
}
