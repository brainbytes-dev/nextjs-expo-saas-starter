import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import {
  organizations,
  users,
  materials,
  tools,
  userSubscriptions,
} from "@repo/db/schema";
import { sql, gte, eq } from "drizzle-orm";

type UserWithRole = { id: string; email: string; role?: string };

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

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      [orgCount],
      [userCount],
      [materialCount],
      [toolCount],
      [signups7d],
      [signups30d],
      activeSubscriptions,
      recentUsers,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(organizations),
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(materials),
      db.select({ count: sql<number>`count(*)::int` }).from(tools),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, sevenDaysAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo)),
      db
        .select({
          planId: userSubscriptions.planId,
          count: sql<number>`count(*)::int`,
        })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.status, "active"))
        .groupBy(userSubscriptions.planId),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(sql`${users.createdAt} DESC`)
        .limit(10),
    ]);

    // Calculate MRR from active subscriptions
    const planPrices: Record<string, number> = {
      starter: 59,
      professional: 199,
      enterprise: 699,
    };

    let mrr = 0;
    for (const sub of activeSubscriptions) {
      const planKey = (sub.planId || "starter").toLowerCase();
      const price = planPrices[planKey] || 59;
      mrr += price * sub.count;
    }

    return NextResponse.json({
      totalOrganizations: orgCount?.count || 0,
      totalUsers: userCount?.count || 0,
      totalMaterials: materialCount?.count || 0,
      totalTools: toolCount?.count || 0,
      mrr,
      signups7d: signups7d?.count || 0,
      signups30d: signups30d?.count || 0,
      recentUsers,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/stats" } });
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
