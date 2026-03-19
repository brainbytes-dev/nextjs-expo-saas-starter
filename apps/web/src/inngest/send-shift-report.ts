import { inngest } from "@/lib/inngest"
import { getDb } from "@repo/db"
import {
  stockChanges,
  toolBookings,
  commissions,
  organizations,
  organizationMembers,
  users,
} from "@repo/db/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { sendShiftReportEmail } from "@/lib/email"

// ---------------------------------------------------------------------------
// Inngest cron — fires daily at 17:00 CET (= 16:00 UTC in winter / 15:00 UTC in summer)
// We use 16:00 UTC to target 17:00 CET (UTC+1 winter time; adjust when DST is relevant).
// ---------------------------------------------------------------------------

function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export const sendShiftReportFn = inngest.createFunction(
  { id: "send-shift-report", retries: 2 },
  { cron: "0 16 * * *" }, // 17:00 CET (UTC+1 winter)
  async () => {
    const db = getDb()

    // Today as ISO date string
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10)
    const { start, end } = dayBounds(today)

    // Fetch all organizations
    const orgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .limit(500)

    let sent = 0
    let failed = 0

    for (const org of orgs) {
      try {
        // Count activity for the day
        const [scCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(stockChanges)
          .where(
            and(
              eq(stockChanges.organizationId, org.id),
              gte(stockChanges.createdAt, start),
              lte(stockChanges.createdAt, end)
            )
          )

        const [tbCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(toolBookings)
          .where(
            and(
              eq(toolBookings.organizationId, org.id),
              gte(toolBookings.createdAt, start),
              lte(toolBookings.createdAt, end)
            )
          )

        const [commCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(commissions)
          .where(
            and(
              eq(commissions.organizationId, org.id),
              gte(commissions.updatedAt, start),
              lte(commissions.updatedAt, end)
            )
          )

        const totalStockChanges = Number(scCount?.count ?? 0)
        const totalToolBookings = Number(tbCount?.count ?? 0)
        const totalCommissions = Number(commCount?.count ?? 0)

        // Skip organisations with no activity today
        if (totalStockChanges + totalToolBookings + totalCommissions === 0) {
          continue
        }

        // Fetch admin recipients
        const adminMembers = await db
          .select({
            email: users.email,
          })
          .from(organizationMembers)
          .leftJoin(users, eq(organizationMembers.userId, users.id))
          .where(
            and(
              eq(organizationMembers.organizationId, org.id),
              eq(organizationMembers.role, "admin")
            )
          )
          .limit(50)

        const recipients = adminMembers
          .map((m) => m.email)
          .filter((e): e is string => Boolean(e))

        if (recipients.length === 0) continue

        await sendShiftReportEmail({
          recipients,
          orgName: org.name,
          date: dateStr,
          totalStockChanges,
          totalToolBookings,
          totalCommissions,
        })

        sent++
      } catch (err) {
        console.error(`[send-shift-report] Failed for org ${org.id}:`, err)
        failed++
      }
    }

    console.log(`[send-shift-report] Sent: ${sent}, Failed: ${failed}`)
    return { sent, failed, date: dateStr }
  }
)
