import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { sendShiftReportEmail } from "@/lib/email";
import {
  stockChanges,
  users,
  toolBookings,
  commissions,
  organizationMembers,
  organizations,
} from "@repo/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /api/reports/shift/send
//
// Body: { date: "2026-03-19" }
//
// Generates the shift report for the given date and emails it to all
// organization admins.
// ---------------------------------------------------------------------------

function dayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json().catch(() => ({}));
    const dateStr: string =
      (body as { date?: string }).date ?? new Date().toISOString().slice(0, 10);

    const { start, end } = dayBounds(dateStr);

    // Fetch org name
    const [orgRow] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    const orgName = orgRow?.name ?? "Ihre Organisation";

    // Fetch admin members
    const adminMembers = await db
      .select({
        userId: organizationMembers.userId,
        email: users.email,
        name: users.name,
      })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.role, "admin")
        )
      )
      .limit(50);

    const recipients = adminMembers
      .map((m) => m.email)
      .filter((e): e is string => Boolean(e));

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Keine Admin-Empfänger gefunden" },
        { status: 400 }
      );
    }

    // Build summary stats
    const [scCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.organizationId, orgId),
          gte(stockChanges.createdAt, start),
          lte(stockChanges.createdAt, end)
        )
      );

    const [tbCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(toolBookings)
      .where(
        and(
          eq(toolBookings.organizationId, orgId),
          gte(toolBookings.createdAt, start),
          lte(toolBookings.createdAt, end)
        )
      );

    const [commCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(commissions)
      .where(
        and(
          eq(commissions.organizationId, orgId),
          gte(commissions.updatedAt, start),
          lte(commissions.updatedAt, end)
        )
      );

    await sendShiftReportEmail({
      recipients,
      orgName,
      date: dateStr,
      totalStockChanges: Number(scCount?.count ?? 0),
      totalToolBookings: Number(tbCount?.count ?? 0),
      totalCommissions: Number(commCount?.count ?? 0),
    });

    return NextResponse.json({ ok: true, recipients });
  } catch (error) {
    console.error("POST /api/reports/shift/send error:", error);
    return NextResponse.json(
      { error: "Fehler beim Versand des Schichtberichts" },
      { status: 500 }
    );
  }
}
