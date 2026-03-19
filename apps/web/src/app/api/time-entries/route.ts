import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { timeEntries, users, commissions, projects } from "@repo/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// ─── GET /api/time-entries ───────────────────────────────────────────────────
// List time entries for the org with user/commission/project joins.
// Query params: ?userId=, ?commissionId=, ?projectId=, ?from=, ?to=, ?status=
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const commissionId = url.searchParams.get("commissionId");
    const projectId = url.searchParams.get("projectId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status");

    const conditions = [eq(timeEntries.organizationId, orgId)];

    if (userId) conditions.push(eq(timeEntries.userId, userId));
    if (commissionId) conditions.push(eq(timeEntries.commissionId, commissionId));
    if (projectId) conditions.push(eq(timeEntries.projectId, projectId));
    if (status) conditions.push(eq(timeEntries.status, status));
    if (from) conditions.push(gte(timeEntries.startTime, new Date(from)));
    if (to) conditions.push(lte(timeEntries.startTime, new Date(to)));

    const rows = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        userName: users.name,
        commissionId: timeEntries.commissionId,
        commissionName: commissions.name,
        projectId: timeEntries.projectId,
        projectName: projects.name,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        durationMinutes: timeEntries.durationMinutes,
        billable: timeEntries.billable,
        hourlyRate: timeEntries.hourlyRate,
        status: timeEntries.status,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
      })
      .from(timeEntries)
      .leftJoin(users, eq(timeEntries.userId, users.id))
      .leftJoin(commissions, eq(timeEntries.commissionId, commissions.id))
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startTime));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/time-entries error:", error);
    return NextResponse.json(
      { error: "Zeiteinträge konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// ─── POST /api/time-entries ──────────────────────────────────────────────────
// Start a timer — creates an entry with startTime=now, status="running".
// Returns 409 if the user already has a running timer.
// Body: { commissionId?, projectId?, description?, billable?, hourlyRate? }
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = (await request.json()) as {
      commissionId?: string | null;
      projectId?: string | null;
      description?: string | null;
      billable?: boolean;
      hourlyRate?: number | null;
    };

    // Check for existing running timer
    const [running] = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.organizationId, orgId),
          eq(timeEntries.userId, session.user.id),
          eq(timeEntries.status, "running")
        )
      )
      .limit(1);

    if (running) {
      return NextResponse.json(
        { error: "Es läuft bereits ein Timer. Bitte stoppen Sie diesen zuerst." },
        { status: 409 }
      );
    }

    const now = new Date();

    const [created] = await db
      .insert(timeEntries)
      .values({
        organizationId: orgId,
        userId: session.user.id,
        commissionId: body.commissionId || null,
        projectId: body.projectId || null,
        description: body.description?.trim() || null,
        billable: body.billable ?? true,
        hourlyRate: body.hourlyRate ?? null,
        startTime: now,
        status: "running",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/time-entries error:", error);
    return NextResponse.json(
      { error: "Timer konnte nicht gestartet werden" },
      { status: 500 }
    );
  }
}
