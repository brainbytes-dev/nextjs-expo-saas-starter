import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { statusChecks } from "@repo/db/schema";
import { lt, sql } from "drizzle-orm";

// Check every 5 minutes (not every minute — saves ~100k rows/year)
export const statusCheckCronFn = inngest.createFunction(
  { id: "status-check-cron" },
  { cron: "*/5 * * * *" },
  async () => {
    const baseUrl =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/status`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`Status check returned ${res.status}`);
    }

    const data = await res.json();
    return { status: data.status, checkedAt: data.lastChecked };
  }
);

// Daily cleanup: delete status checks older than 90 days
export const statusCleanupCronFn = inngest.createFunction(
  { id: "status-cleanup-cron" },
  { cron: "0 3 * * *" }, // 3 AM daily
  async () => {
    const db = getDb();
    const cutoff = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // keep 400 days for 1-year view
    const result = await db
      .delete(statusChecks)
      .where(lt(statusChecks.checkedAt, cutoff));
    return { deleted: result.rowCount ?? 0 };
  }
);
