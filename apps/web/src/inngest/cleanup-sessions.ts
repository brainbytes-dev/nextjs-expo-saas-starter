import { inngest } from "@/lib/inngest";
import { getDb, sql } from "@repo/db";

export const cleanupSessionsFn = inngest.createFunction(
  { id: "cleanup-sessions" },
  { cron: "0 3 * * *" }, // Daily at 3 AM UTC
  async () => {
    const db = getDb();

    // Delete Better-Auth sessions that expired more than 24 hours ago
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.execute(
      sql`DELETE FROM session WHERE expires_at < ${cutoff.toISOString()}`
    );

    const deleted = result.count ?? 0;
    console.log(`Session cleanup: removed ${deleted} expired sessions`);
    return { deleted, timestamp: new Date().toISOString() };
  }
);
