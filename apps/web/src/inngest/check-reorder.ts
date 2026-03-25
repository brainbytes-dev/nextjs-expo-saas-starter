import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { alertSettings, organizations, organizationMembers, users } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { checkAndCreateReorders } from "@/lib/auto-reorder";
import { sendAutoReorderEmail } from "@/lib/email";

// ── Cron: daily at 06:00 UTC (= 08:00 CET) ───────────────────────────
export const checkReorderFn = inngest.createFunction(
  { id: "check-reorder", retries: 2 },
  { cron: "0 6 * * *" },
  async () => {
    const db = getDb();

    // Fetch orgs that have auto-reorder enabled
    const orgsWithAutoReorder = await db
      .select({
        orgId: alertSettings.organizationId,
        orgName: organizations.name,
        reorderTargetMultiplier: alertSettings.reorderTargetMultiplier,
        emailAlerts: alertSettings.emailAlerts,
      })
      .from(alertSettings)
      .innerJoin(organizations, eq(alertSettings.organizationId, organizations.id))
      .where(eq(alertSettings.autoReorder, true));

    const results: Array<{
      orgId: string;
      ordersCreated: number;
      itemsOrdered: number;
      skippedCount: number;
    }> = [];

    for (const org of orgsWithAutoReorder) {
      const multiplier = org.reorderTargetMultiplier ?? 2;
      const result = await checkAndCreateReorders(org.orgId, multiplier);

      results.push({
        orgId: org.orgId,
        ordersCreated: result.ordersCreated,
        itemsOrdered: result.itemsOrdered,
        skippedCount: result.skipped.length,
      });

      // Send notification email if orders were created and email alerts are on
      if (result.ordersCreated > 0 && org.emailAlerts) {
        const ownerRow = await db
          .select({ email: users.email, name: users.name })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(
            and(
              eq(organizationMembers.organizationId, org.orgId),
              eq(organizationMembers.role, "owner")
            )
          )
          .limit(1);

        const owner = ownerRow[0];
        if (owner) {
          try {
            await sendAutoReorderEmail({
              ownerEmail: owner.email,
              ownerName: owner.name ?? "Team",
              ordersCreated: result.ordersCreated,
              itemsOrdered: result.itemsOrdered,
              details: result.details,
              skipped: result.skipped,
            });
          } catch (err) {
            console.error(`[check-reorder] E-Mail fehlgeschlagen für Org ${org.orgId}:`, err);
          }
        }
      }
    }

    console.log(
      `[check-reorder] ${orgsWithAutoReorder.length} Orgs verarbeitet`,
      results
    );
    return { processed: orgsWithAutoReorder.length, results };
  }
);
