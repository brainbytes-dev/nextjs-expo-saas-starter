import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { featureUsage, organizations } from "@repo/db/schema";
import { sql, gte } from "drizzle-orm";

type UserWithRole = { id: string; email: string; role?: string };

// ─── GET /api/admin/analytics ────────────────────────────────────────────────
//
// Returns 4 analytics datasets for the last 30 days:
//   - featureAdoption: % of orgs using each feature
//   - topFeatures: platform-wide usage counts, ranked
//   - orgMatrix: per-org × per-feature usage counts
//   - inactiveOrgs: orgs with 0 activity

export async function GET(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user as UserWithRole | undefined;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // 1. All orgs
    const allOrgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .orderBy(organizations.name);

    const totalOrgs = allOrgs.length;

    // 2. Feature totals (last 30d)
    const featureTotals = await db
      .select({
        feature: featureUsage.feature,
        totalCount: sql<number>`SUM(${featureUsage.count})`,
        orgCount: sql<number>`COUNT(DISTINCT ${featureUsage.organizationId})`,
      })
      .from(featureUsage)
      .where(gte(featureUsage.date, cutoffStr))
      .groupBy(featureUsage.feature)
      .orderBy(sql`SUM(${featureUsage.count}) DESC`);

    // 3. Feature adoption % per feature
    const featureAdoption = featureTotals.map((row) => ({
      feature: row.feature,
      totalCount: Number(row.totalCount),
      orgCount: Number(row.orgCount),
      adoptionPct: totalOrgs > 0 ? Math.round((Number(row.orgCount) / totalOrgs) * 100) : 0,
    }));

    // 4. Per-org matrix: orgs × features, last 30d
    const orgFeatureRows = await db
      .select({
        organizationId: featureUsage.organizationId,
        feature: featureUsage.feature,
        totalCount: sql<number>`SUM(${featureUsage.count})`,
      })
      .from(featureUsage)
      .where(gte(featureUsage.date, cutoffStr))
      .groupBy(featureUsage.organizationId, featureUsage.feature);

    // Build a map: orgId → { feature → count }
    const orgFeatureMap: Record<string, Record<string, number>> = {};
    for (const row of orgFeatureRows) {
      if (!orgFeatureMap[row.organizationId]) {
        orgFeatureMap[row.organizationId] = {};
      }
      orgFeatureMap[row.organizationId]![row.feature] = Number(row.totalCount);
    }

    const orgMatrix = allOrgs.map((org) => ({
      orgId: org.id,
      orgName: org.name,
      features: orgFeatureMap[org.id] ?? {},
    }));

    // 5. Inactive orgs (0 activity in last 30d)
    const activeOrgIds = new Set(orgFeatureRows.map((r) => r.organizationId));
    const inactiveOrgs = allOrgs
      .filter((org) => !activeOrgIds.has(org.id))
      .map((org) => ({ orgId: org.id, orgName: org.name }));

    return NextResponse.json({
      period: { from: cutoffStr, to: new Date().toISOString().slice(0, 10) },
      totalOrgs,
      featureAdoption,
      topFeatures: featureAdoption, // same array, already sorted by count desc
      orgMatrix,
      inactiveOrgs,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
