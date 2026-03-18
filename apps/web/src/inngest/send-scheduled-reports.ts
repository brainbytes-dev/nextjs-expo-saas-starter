import { inngest } from "@/lib/inngest"
import { getDb } from "@repo/db"
import {
  scheduledReports,
  materials,
  materialStocks,
  tools,
  toolGroups,
  locations,
  organizations,
  organizationMembers,
  users,
} from "@repo/db/schema"
import { eq, and, gte } from "drizzle-orm"
import { DEMO_MODE } from "@/lib/demo-mode"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.logistikapp.ch"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@logistikapp.ch"

// ── Schedule → cron ─────────────────────────────────────────────────────────
// We store human-readable schedules and translate here instead of storing
// raw cron strings (avoids user input of arbitrary cron).
function isDue(schedule: string, lastSentAt: Date | null): boolean {
  const now = new Date()
  if (!lastSentAt) return true

  const msSince = now.getTime() - lastSentAt.getTime()

  switch (schedule) {
    case "daily":
      return msSince >= 23 * 60 * 60 * 1000 // allow up to 1h drift
    case "weekly":
      return msSince >= 6.5 * 24 * 60 * 60 * 1000
    case "monthly":
      return msSince >= 27 * 24 * 60 * 60 * 1000 // conservative
    default:
      return false
  }
}

// ── Report generators ────────────────────────────────────────────────────────
async function generateInventoryReport(orgId: string) {
  const db = getDb()
  const rows = await db
    .select({
      name: materials.name,
      number: materials.number,
      unit: materials.unit,
      quantity: materialStocks.quantity,
      locationName: locations.name,
    })
    .from(materials)
    .leftJoin(materialStocks, eq(materialStocks.materialId, materials.id))
    .leftJoin(locations, eq(locations.id, materials.locationId))
    .where(and(eq(materials.organizationId, orgId), eq(materials.isActive, true)))
    .limit(5000)

  return rows.map((r) => ({
    Name: r.name,
    Nummer: r.number ?? "",
    Einheit: r.unit ?? "",
    Bestand: r.quantity != null ? String(r.quantity) : "0",
    Standort: r.locationName ?? "",
  }))
}

async function generateToolsReport(orgId: string) {
  const db = getDb()
  const rows = await db
    .select({
      name: tools.name,
      number: tools.number,
      condition: tools.condition,
      groupName: toolGroups.name,
      locationName: locations.name,
      nextMaintenanceDate: tools.nextMaintenanceDate,
    })
    .from(tools)
    .leftJoin(toolGroups, eq(toolGroups.id, tools.groupId))
    .leftJoin(locations, eq(locations.id, tools.homeLocationId))
    .where(and(eq(tools.organizationId, orgId), eq(tools.isActive, true)))
    .limit(5000)

  return rows.map((r) => ({
    Name: r.name,
    Nummer: r.number ?? "",
    Zustand: r.condition ?? "",
    Gruppe: r.groupName ?? "",
    Standort: r.locationName ?? "",
    "Nächste Wartung": r.nextMaintenanceDate ?? "",
  }))
}

// ── CSV builder ──────────────────────────────────────────────────────────────
function buildCsvString(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "\uFEFF"
  const headers = Object.keys(rows[0]!)
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const headerLine = headers.map(escape).join(";")
  const dataLines = rows.map((row) =>
    headers.map((h) => escape(row[h] ?? "")).join(";")
  )
  return "\uFEFF" + [headerLine, ...dataLines].join("\n")
}

// ── Send via Resend ──────────────────────────────────────────────────────────
async function sendReportEmail(
  recipients: string[],
  reportType: string,
  orgName: string,
  csvContent: string,
  schedule: string
) {
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)

  const typeLabels: Record<string, string> = {
    inventory: "Inventarbericht",
    tools: "Werkzeugbericht",
    movements: "Bewegungsbericht",
    commissions: "Kommissionsbericht",
  }
  const scheduleLabels: Record<string, string> = {
    daily: "täglich",
    weekly: "wöchentlich",
    monthly: "monatlich",
  }

  const label = typeLabels[reportType] ?? reportType
  const schedLabel = scheduleLabels[schedule] ?? schedule
  const filename = `${reportType}-${new Date().toISOString().split("T")[0]}.csv`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: recipients,
    subject: `${label} — ${orgName} (${schedLabel})`,
    html: `
      <h2>${label} — ${orgName}</h2>
      <p>Im Anhang findest du den ${schedLabel}en ${label} für deine Organisation.</p>
      <p>
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Dashboard öffnen
        </a>
      </p>
      <p style="color:#999;font-size:12px;">
        Dieser Bericht wird automatisch ${schedLabel} verschickt.<br>
        Einstellungen: ${APP_URL}/dashboard/settings/scheduled-reports
      </p>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(csvContent, "utf-8").toString("base64"),
      },
    ],
  })
}

// ── Inngest function — runs every hour, checks which reports are due ──────────
export const sendScheduledReportsFn = inngest.createFunction(
  { id: "send-scheduled-reports", retries: 2 },
  { cron: "0 * * * *" }, // every hour
  async () => {
    if (DEMO_MODE) {
      console.log("[DEMO] Skipping scheduled reports")
      return { skipped: true }
    }

    const db = getDb()

    // Fetch all active scheduled reports
    const activeReports = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.isActive, true))
      .limit(500)

    const sent: string[] = []
    const skipped: string[] = []

    for (const report of activeReports) {
      if (!isDue(report.schedule, report.lastSentAt)) {
        skipped.push(report.id)
        continue
      }

      // Fetch org name
      const orgRow = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, report.organizationId))
        .limit(1)
      const orgName = orgRow[0]?.name ?? "Unbekannte Organisation"

      try {
        // Generate report data
        let rows: Record<string, string>[] = []
        switch (report.reportType) {
          case "inventory":
            rows = await generateInventoryReport(report.organizationId)
            break
          case "tools":
            rows = await generateToolsReport(report.organizationId)
            break
          default:
            // Other types (movements, commissions) are placeholders — skip gracefully
            console.warn(
              `[send-scheduled-reports] Unsupported reportType: ${report.reportType}`
            )
            skipped.push(report.id)
            continue
        }

        const csv = buildCsvString(rows)
        await sendReportEmail(
          report.recipients,
          report.reportType,
          orgName,
          csv,
          report.schedule
        )

        // Update lastSentAt
        await db
          .update(scheduledReports)
          .set({ lastSentAt: new Date(), updatedAt: new Date() })
          .where(eq(scheduledReports.id, report.id))

        sent.push(report.id)
      } catch (err) {
        console.error(
          `[send-scheduled-reports] Failed for report ${report.id}:`,
          err
        )
      }
    }

    console.log(
      `[send-scheduled-reports] Sent: ${sent.length}, Skipped: ${skipped.length}`
    )
    return { sent: sent.length, skipped: skipped.length }
  }
)
