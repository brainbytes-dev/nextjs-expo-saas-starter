import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools, users, locations } from "@repo/db/schema";
import { eq, and, isNotNull, lte } from "drizzle-orm";

// GET /api/maintenance?days=30
// Returns tools with nextMaintenanceDate within the next N days (default 30),
// plus overdue tools (nextMaintenanceDate < today).
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") ?? "30")));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const rows = await db
      .select({
        id: tools.id,
        number: tools.number,
        name: tools.name,
        nextMaintenanceDate: tools.nextMaintenanceDate,
        lastMaintenanceDate: tools.lastMaintenanceDate,
        maintenanceIntervalDays: tools.maintenanceIntervalDays,
        assignedToId: tools.assignedToId,
        assignedUserName: users.name,
        homeLocationId: tools.homeLocationId,
        homeLocationName: locations.name,
        condition: tools.condition,
      })
      .from(tools)
      .leftJoin(users, eq(tools.assignedToId, users.id))
      .leftJoin(locations, eq(tools.homeLocationId, locations.id))
      .where(
        and(
          eq(tools.organizationId, orgId),
          eq(tools.isActive, true),
          isNotNull(tools.nextMaintenanceDate),
          lte(tools.nextMaintenanceDate, cutoffStr)
        )
      )
      .orderBy(tools.nextMaintenanceDate)
      .limit(200);

    const today = new Date().toISOString().split("T")[0]!;

    const annotated = rows.map((row) => {
      const due = row.nextMaintenanceDate!;
      let status: "overdue" | "this-week" | "upcoming";
      const daysUntil = Math.ceil(
        (new Date(due).getTime() - new Date(today).getTime()) / 86_400_000
      );
      if (due < today) {
        status = "overdue";
      } else if (daysUntil <= 7) {
        status = "this-week";
      } else {
        status = "upcoming";
      }
      return { ...row, status, daysUntil };
    });

    return NextResponse.json(annotated);
  } catch (error) {
    console.error("GET /api/maintenance error:", error);
    return NextResponse.json(
      { error: "Wartungen konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
