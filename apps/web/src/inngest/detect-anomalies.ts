import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import {
  organizations,
  alertSettings,
  organizationMembers,
  users,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { runAnomalyDetection } from "@/lib/anomaly-detection";
import { sendAnomalyAlertEmail } from "@/lib/email";

// ── Cron: every 4 hours ───────────────────────────────────────────────────

export const detectAnomaliesFn = inngest.createFunction(
  { id: "detect-anomalies", retries: 2 },
  { cron: "0 */4 * * *" },
  async () => {
    const db = getDb();

    // Fetch all orgs that have email alerts enabled
    const orgRows = await db
      .select({
        orgId: alertSettings.organizationId,
        orgName: organizations.name,
        emailAlerts: alertSettings.emailAlerts,
      })
      .from(alertSettings)
      .innerJoin(organizations, eq(alertSettings.organizationId, organizations.id))
      .where(eq(alertSettings.emailAlerts, true));

    const results: Array<{
      orgId: string;
      anomalyCount: number;
      highCount: number;
      emailSent: boolean;
    }> = [];

    for (const org of orgRows) {
      let anomalyCount = 0;
      let highCount = 0;
      let emailSent = false;

      try {
        const anomalies = await runAnomalyDetection(org.orgId);
        anomalyCount = anomalies.length;
        highCount = anomalies.filter((a) => a.severity === "high").length;

        if (highCount === 0) {
          results.push({ orgId: org.orgId, anomalyCount, highCount, emailSent });
          continue;
        }

        // Find the org owner/admin to notify
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
        if (!owner) {
          results.push({ orgId: org.orgId, anomalyCount, highCount, emailSent });
          continue;
        }

        // Build email content from high-severity anomalies
        const highAnomalies = anomalies.filter((a) => a.severity === "high");

        try {
          await sendAnomalyAlertEmail({
            ownerEmail: owner.email,
            ownerName: owner.name ?? "Team",
            orgName: org.orgName,
            highCount,
            anomalyDescriptions: highAnomalies.map((a) => a.description),
          });
          emailSent = true;
        } catch (emailErr) {
          console.error(
            `[detect-anomalies] E-Mail fehlgeschlagen für Org ${org.orgId}:`,
            emailErr
          );
        }
      } catch (detectionErr) {
        console.error(
          `[detect-anomalies] Erkennung fehlgeschlagen für Org ${org.orgId}:`,
          detectionErr
        );
      }

      results.push({ orgId: org.orgId, anomalyCount, highCount, emailSent });
    }

    console.log(
      `[detect-anomalies] ${orgRows.length} Orgs verarbeitet`,
      results
    );
    return { processed: orgRows.length, results };
  }
);
