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
import { DEMO_MODE } from "@/lib/demo-mode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.logistikapp.ch";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Cron: every 4 hours ───────────────────────────────────────────────────

export const detectAnomaliesFn = inngest.createFunction(
  { id: "detect-anomalies", retries: 2 },
  { cron: "0 */4 * * *" },
  async () => {
    if (DEMO_MODE) {
      console.log("[DEMO] Skipping anomaly detection");
      return { skipped: true };
    }

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
        const anomalyLines = highAnomalies
          .slice(0, 5)
          .map(
            (a) =>
              `<li style="margin-bottom:8px;">${escapeHtml(a.description)}</li>`
          )
          .join("");

        const moreCount = highAnomalies.length > 5 ? highAnomalies.length - 5 : 0;

        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? "noreply@logistikapp.ch",
            to: owner.email,
            subject: `Anomalie-Alarm: ${highCount} kritische Bewegung${highCount !== 1 ? "en" : ""} erkannt — ${escapeHtml(org.orgName)}`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
                <h2 style="color:#dc2626;">Anomalie-Alarm von LogistikApp</h2>
                <p>Hallo ${escapeHtml(owner.name ?? "Team")},</p>
                <p>
                  Die automatische Anomalieerkennung hat <strong>${highCount} kritische
                  Lager${highCount !== 1 ? "bewegungen" : "bewegung"}</strong> in deiner Organisation
                  <strong>${escapeHtml(org.orgName)}</strong> erkannt:
                </p>
                <ul style="padding-left:20px;color:#374151;">
                  ${anomalyLines}
                </ul>
                ${
                  moreCount > 0
                    ? `<p style="color:#6b7280;font-size:14px;">... und ${moreCount} weitere Anomali${moreCount !== 1 ? "en" : "e"}.</p>`
                    : ""
                }
                <p>
                  <a
                    href="${APP_URL}/dashboard/anomalies"
                    style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;"
                  >
                    Anomalien prüfen
                  </a>
                </p>
                <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
                  Diese Benachrichtigung wird alle 4 Stunden verschickt, sofern kritische Anomalien vorliegen.
                  Die Erkennung basiert auf statistischen Methoden (Z-Score, Perzentile) und kann Fehlalarme enthalten.
                </p>
              </div>
            `,
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
