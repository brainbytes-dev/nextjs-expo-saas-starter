import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools, toolBookings } from "@repo/db/schema";
import { eq, and, gte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const period = Math.min(
      Math.max(parseInt(url.searchParams.get("period") ?? "30", 10) || 30, 1),
      365
    );

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);

    // Get all active tools for this org
    const allTools = await db
      .select({
        id: tools.id,
        name: tools.name,
        number: tools.number,
      })
      .from(tools)
      .where(
        and(eq(tools.organizationId, orgId), eq(tools.isActive, true))
      );

    if (allTools.length === 0) {
      return NextResponse.json({
        tools: [],
        summary: {
          avgUtilization: 0,
          mostUsed: null,
          leastUsed: null,
          totalBookingHours: 0,
        },
      });
    }

    // Get all bookings in the period for this org
    const bookings = await db
      .select({
        toolId: toolBookings.toolId,
        bookingType: toolBookings.bookingType,
        createdAt: toolBookings.createdAt,
      })
      .from(toolBookings)
      .where(
        and(
          eq(toolBookings.organizationId, orgId),
          gte(toolBookings.createdAt, cutoff)
        )
      )
      .orderBy(toolBookings.toolId, toolBookings.createdAt);

    // Group bookings by tool
    const toolBookingsMap = new Map<
      string,
      { bookingType: string; createdAt: Date }[]
    >();
    for (const b of bookings) {
      if (!toolBookingsMap.has(b.toolId)) {
        toolBookingsMap.set(b.toolId, []);
      }
      toolBookingsMap.get(b.toolId)!.push({
        bookingType: b.bookingType,
        createdAt: b.createdAt,
      });
    }

    // Calculate utilization per tool
    const workdayHours = 8;
    const totalWorkHours = period * workdayHours;

    const toolStats = allTools.map((tool) => {
      const entries = toolBookingsMap.get(tool.id) ?? [];
      const bookingCount = entries.length;

      // Calculate checked-out hours by pairing checkout→checkin
      let checkedOutHours = 0;
      let lastCheckout: Date | null = null;

      for (const entry of entries) {
        if (entry.bookingType === "checkout") {
          lastCheckout = entry.createdAt;
        } else if (entry.bookingType === "checkin" && lastCheckout) {
          const diffMs =
            entry.createdAt.getTime() - lastCheckout.getTime();
          checkedOutHours += diffMs / (1000 * 60 * 60);
          lastCheckout = null;
        }
      }

      // If still checked out, count time until now
      if (lastCheckout) {
        const diffMs = Date.now() - lastCheckout.getTime();
        checkedOutHours += diffMs / (1000 * 60 * 60);
      }

      // Days since last booking
      const lastBooking = entries.length > 0 ? entries[entries.length - 1]! : null;
      const daysSinceLastBooking = lastBooking
        ? Math.floor(
            (Date.now() - lastBooking.createdAt.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      const utilizationRate = Math.min(
        Math.round((checkedOutHours / totalWorkHours) * 100 * 10) / 10,
        100
      );

      return {
        id: tool.id,
        name: tool.name,
        number: tool.number,
        bookingCount,
        checkedOutHours: Math.round(checkedOutHours * 10) / 10,
        daysSinceLastBooking,
        utilizationRate,
        lastBookingDate: lastBooking?.createdAt.toISOString() ?? null,
      };
    });

    // Sort by utilization (lowest first = underutilized)
    toolStats.sort((a, b) => a.utilizationRate - b.utilizationRate);

    // Summary
    const avgUtilization =
      toolStats.length > 0
        ? Math.round(
            (toolStats.reduce((sum, t) => sum + t.utilizationRate, 0) /
              toolStats.length) *
              10
          ) / 10
        : 0;

    const totalBookingHours = Math.round(
      toolStats.reduce((sum, t) => sum + t.checkedOutHours, 0) * 10
    ) / 10;

    // Most/least used based on utilization
    const sorted = [...toolStats].sort(
      (a, b) => b.utilizationRate - a.utilizationRate
    );
    const mostUsed =
      sorted.length > 0
        ? { name: sorted[0]!.name, utilization: sorted[0]!.utilizationRate }
        : null;
    const leastUsed =
      sorted.length > 0
        ? {
            name: sorted[sorted.length - 1]!.name,
            utilization: sorted[sorted.length - 1]!.utilizationRate,
          }
        : null;

    return NextResponse.json({
      tools: toolStats,
      summary: {
        avgUtilization,
        mostUsed,
        leastUsed,
        totalBookingHours,
      },
    });
  } catch (error) {
    console.error("Utilization analytics error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
