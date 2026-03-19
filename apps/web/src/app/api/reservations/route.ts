import { NextResponse } from "next/server";
import { reservations, users } from "@repo/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";

// ─── GET /api/reservations ────────────────────────────────────────────────────
export async function GET(request: Request) {
  const result = await getSessionAndOrg(request);
  if (result.error) return result.error;
  const { orgId, db } = result;

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  try {
    const conditions = [eq(reservations.organizationId, orgId)];

    if (entityType) conditions.push(eq(reservations.entityType, entityType));
    if (entityId) conditions.push(eq(reservations.entityId, entityId));
    if (userId) conditions.push(eq(reservations.userId, userId));
    if (status) conditions.push(eq(reservations.status, status));
    if (startDate) conditions.push(gte(reservations.endDate, startDate));
    if (endDate) conditions.push(lte(reservations.startDate, endDate));

    const rows = await db
      .select({
        id: reservations.id,
        entityType: reservations.entityType,
        entityId: reservations.entityId,
        userId: reservations.userId,
        userName: users.name,
        userEmail: users.email,
        quantity: reservations.quantity,
        startDate: reservations.startDate,
        endDate: reservations.endDate,
        purpose: reservations.purpose,
        status: reservations.status,
        createdAt: reservations.createdAt,
        updatedAt: reservations.updatedAt,
      })
      .from(reservations)
      .leftJoin(users, eq(reservations.userId, users.id))
      .where(and(...conditions))
      .orderBy(reservations.startDate);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[GET /api/reservations]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// ─── POST /api/reservations ───────────────────────────────────────────────────
export async function POST(request: Request) {
  const result = await getSessionAndOrg(request);
  if (result.error) return result.error;
  const { session, orgId, db } = result;

  try {
    const body = await request.json();
    const { entityType, entityId, quantity, startDate, endDate, purpose } = body;

    if (!entityType || !entityId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "entityType, entityId, startDate und endDate sind erforderlich" },
        { status: 400 }
      );
    }

    if (!["tool", "material"].includes(entityType)) {
      return NextResponse.json({ error: "Ungültiger entityType" }, { status: 400 });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Startdatum muss vor Enddatum liegen" },
        { status: 400 }
      );
    }

    // Conflict detection: overlapping active/confirmed/pending reservations
    const conflicts = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.organizationId, orgId),
          eq(reservations.entityType, entityType),
          eq(reservations.entityId, entityId),
          // Exclude cancelled/completed
          sql`${reservations.status} NOT IN ('cancelled', 'completed')`,
          // Overlap: existing.start <= new.end AND existing.end >= new.start
          lte(reservations.startDate, endDate),
          gte(reservations.endDate, startDate)
        )
      )
      .limit(1);

    const [created] = await db
      .insert(reservations)
      .values({
        organizationId: orgId,
        entityType,
        entityId,
        userId: session.user.id,
        quantity: quantity ?? 1,
        startDate,
        endDate,
        purpose: purpose || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      ...created,
      hasConflict: conflicts.length > 0,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reservations]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
