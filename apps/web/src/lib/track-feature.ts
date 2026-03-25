import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@repo/db/schema";
import { sql } from "drizzle-orm";

export type TrackedFeature =
  | "orders"
  | "stock_changes"
  | "tool_bookings"
  | "commissions"
  | "shift_handovers"
  | "exports"
  | "imports"
  | "keys"
  | "materials"
  | "suppliers"
  | "vehicles";

/**
 * Fire-and-forget feature usage tracking.
 * Never throws — tracking errors never affect the main request.
 * Upserts a daily count row for the given org + feature.
 */
export function trackFeature(
  db: PostgresJsDatabase<typeof schema>,
  orgId: string,
  feature: TrackedFeature
): void {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  void db
    .execute(
      sql`
        INSERT INTO feature_usage (id, organization_id, feature, date, count, created_at, updated_at)
        VALUES (gen_random_uuid(), ${orgId}, ${feature}, ${today}, 1, now(), now())
        ON CONFLICT (organization_id, feature, date)
        DO UPDATE SET count = feature_usage.count + 1, updated_at = now()
      `
    )
    .catch(() => {
      // silent fail — analytics must never break main request
    });
}
