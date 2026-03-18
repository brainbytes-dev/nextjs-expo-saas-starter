import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { alertSettings, organizations, organizationMembers, users } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { checkAndCreateReorders } from "@/lib/auto-reorder";
import { DEMO_MODE } from "@/lib/demo-mode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.logistikapp.ch";

// ── Cron: daily at 06:00 UTC (= 08:00 CET) ───────────────────────────
export const checkReorderFn = inngest.createFunction(
  { id: "check-reorder", retries: 2 },
  { cron: "0 6 * * *" },
  async () => {
    if (DEMO_MODE) {
      console.log("[DEMO] Skipping auto-reorder check");
      return { skipped: true };
    }

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
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            const itemLines = result.details
              .map(
                (d) =>
                  `• ${d.materialName} → ${d.quantity} Stk. @ CHF ${(d.unitPrice / 100).toFixed(2)} (${d.supplierName})`
              )
              .join("\n");

            const skippedLines =
              result.skipped.length > 0
                ? `\nNicht bestellbar (${result.skipped.length}):\n` +
                  result.skipped
                    .map((s) => `• ${s.materialName}: ${s.reason}`)
                    .join("\n")
                : "";

            await resend.emails.send({
              from: "LogistikApp <no-reply@logistikapp.ch>",
              to: owner.email,
              subject: `Auto-Nachbestellung: ${result.ordersCreated} Bestellung${result.ordersCreated !== 1 ? "en" : ""} erstellt`,
              text: [
                `Hallo ${owner.name ?? "Team"},`,
                "",
                `Die automatische Nachbestellung hat heute ${result.ordersCreated} Bestellung${result.ordersCreated !== 1 ? "en" : ""} mit ${result.itemsOrdered} Position${result.itemsOrdered !== 1 ? "en" : ""} erstellt.`,
                "",
                "Bestellte Positionen:",
                itemLines,
                skippedLines,
                "",
                `Bestellungen anzeigen: ${APP_URL}/dashboard/orders`,
                "",
                "-- LogistikApp Auto-Reorder",
              ].join("\n"),
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
