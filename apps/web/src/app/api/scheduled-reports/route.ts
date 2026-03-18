import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { scheduledReports } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

// Supported schedule options (stored as human-readable keys; cron resolved on the Inngest side)
const VALID_SCHEDULES = ["daily", "weekly", "monthly"] as const
const VALID_REPORT_TYPES = ["inventory", "tools", "movements", "commissions"] as const
const VALID_FORMATS = ["csv", "pdf"] as const

// ---------------------------------------------------------------------------
// GET — list scheduled reports for the current org
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  const rows = await db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.organizationId, orgId))
    .orderBy(scheduledReports.createdAt)

  return NextResponse.json(rows)
}

// ---------------------------------------------------------------------------
// POST — create a new scheduled report
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const { reportType, schedule, recipients, format = "csv", filters } =
    body as Record<string, unknown>

  if (
    !reportType ||
    !VALID_REPORT_TYPES.includes(reportType as (typeof VALID_REPORT_TYPES)[number])
  ) {
    return NextResponse.json(
      { error: "Ungültiger Berichtstyp" },
      { status: 400 }
    )
  }

  if (
    !schedule ||
    !VALID_SCHEDULES.includes(schedule as (typeof VALID_SCHEDULES)[number])
  ) {
    return NextResponse.json(
      { error: "Ungültiger Zeitplan. Erlaubt: daily, weekly, monthly" },
      { status: 400 }
    )
  }

  if (
    !recipients ||
    !Array.isArray(recipients) ||
    recipients.length === 0 ||
    recipients.some((r) => typeof r !== "string" || !r.includes("@"))
  ) {
    return NextResponse.json(
      { error: "Mindestens ein gültiger Empfänger erforderlich" },
      { status: 400 }
    )
  }

  if (!VALID_FORMATS.includes(format as (typeof VALID_FORMATS)[number])) {
    return NextResponse.json(
      { error: "Ungültiges Format. Erlaubt: csv, pdf" },
      { status: 400 }
    )
  }

  const [created] = await db
    .insert(scheduledReports)
    .values({
      organizationId: orgId,
      reportType: reportType as string,
      schedule: schedule as string,
      recipients: recipients as string[],
      format: format as string,
      filters: filters ?? null,
      isActive: true,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}

// ---------------------------------------------------------------------------
// PATCH — update a scheduled report (bulk — pass id in body)
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const { id, ...updates } = body as Record<string, unknown>
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID erforderlich" }, { status: 400 })
  }

  // Sanitise allowed update fields
  const allowed: Record<string, unknown> = {}
  if (typeof updates.isActive === "boolean") allowed.isActive = updates.isActive
  if (updates.recipients && Array.isArray(updates.recipients))
    allowed.recipients = updates.recipients
  if (updates.schedule && VALID_SCHEDULES.includes(updates.schedule as (typeof VALID_SCHEDULES)[number]))
    allowed.schedule = updates.schedule
  if (updates.format && VALID_FORMATS.includes(updates.format as (typeof VALID_FORMATS)[number]))
    allowed.format = updates.format
  if (updates.filters !== undefined) allowed.filters = updates.filters

  allowed.updatedAt = new Date()

  const [updated] = await db
    .update(scheduledReports)
    .set(allowed)
    .where(
      and(
        eq(scheduledReports.id, id),
        eq(scheduledReports.organizationId, orgId)
      )
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

// ---------------------------------------------------------------------------
// DELETE — remove a scheduled report (pass id in body)
// ---------------------------------------------------------------------------
export async function DELETE(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  const url = new URL(request.url)
  const id = url.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID erforderlich" }, { status: 400 })
  }

  await db
    .delete(scheduledReports)
    .where(
      and(
        eq(scheduledReports.id, id),
        eq(scheduledReports.organizationId, orgId)
      )
    )

  return NextResponse.json({ success: true })
}
