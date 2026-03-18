import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { toolBookings, tools, users } from "@repo/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
    const toolId = url.searchParams.get("toolId");
    const userId = url.searchParams.get("userId");
    const bookingType = url.searchParams.get("bookingType");
    const offset = (page - 1) * limit;

    const conditions = [eq(toolBookings.organizationId, orgId)];
    if (toolId) {
      conditions.push(eq(toolBookings.toolId, toolId));
    }
    if (userId) {
      conditions.push(eq(toolBookings.userId, userId));
    }
    if (bookingType) {
      conditions.push(eq(toolBookings.bookingType, bookingType));
    }

    // We need aliases for from/to locations but drizzle doesn't easily support multiple joins
    // to the same table without aliases. We'll use a simpler approach.
    const [items, countResult] = await Promise.all([
      db
        .select({
          id: toolBookings.id,
          toolId: toolBookings.toolId,
          toolName: tools.name,
          toolNumber: tools.number,
          userId: toolBookings.userId,
          userName: users.name,
          fromLocationId: toolBookings.fromLocationId,
          toLocationId: toolBookings.toLocationId,
          bookingType: toolBookings.bookingType,
          notes: toolBookings.notes,
          createdAt: toolBookings.createdAt,
        })
        .from(toolBookings)
        .leftJoin(tools, eq(toolBookings.toolId, tools.id))
        .leftJoin(users, eq(toolBookings.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(toolBookings.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(toolBookings)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/tool-bookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tool bookings" },
      { status: 500 }
    );
  }
}
