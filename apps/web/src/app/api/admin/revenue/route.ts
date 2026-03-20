import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { getDb, payments, userSubscriptions, eq, sql } from "@repo/db";

type UserWithRole = { id: string; email: string; role?: string };

// Plan prices in cents (CHF) — must match your Stripe plans
const PLAN_PRICES: Record<string, number> = {
  starter: 4900, // CHF 49/mo
  professional: 9900, // CHF 99/mo
  enterprise: 24900, // CHF 249/mo
};

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

    // Active subscriptions with plan info
    const activeSubscriptions = await db
      .select({
        planId: userSubscriptions.planId,
        count: sql<number>`count(*)::int`,
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, "active"))
      .groupBy(userSubscriptions.planId);

    // Calculate MRR
    let mrr = 0;
    let activeCount = 0;
    for (const row of activeSubscriptions) {
      const price = PLAN_PRICES[row.planId ?? ""] ?? 0;
      mrr += price * row.count;
      activeCount += row.count;
    }

    // Total revenue (sum of succeeded payments)
    const totalRevenueResult = await db
      .select({
        total: sql<number>`coalesce(sum(${payments.amount}), 0)::bigint`,
      })
      .from(payments)
      .where(eq(payments.status, "succeeded"));

    const totalRevenue = Number(totalRevenueResult[0]?.total ?? 0);

    // Revenue by month (last 6 months)
    const revenueByMonth = await db
      .select({
        month: sql<string>`to_char(${payments.createdAt}, 'YYYY-MM')`,
        amount: sql<number>`coalesce(sum(${payments.amount}), 0)::bigint`,
      })
      .from(payments)
      .where(
        sql`${payments.status} = 'succeeded' AND ${payments.createdAt} >= now() - interval '6 months'`
      )
      .groupBy(sql`to_char(${payments.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${payments.createdAt}, 'YYYY-MM')`);

    // Cancelled in last 30 days
    const cancelledResult = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(userSubscriptions)
      .where(
        sql`${userSubscriptions.canceledAt} >= now() - interval '30 days'`
      );

    const cancelledLast30d = cancelledResult[0]?.count ?? 0;

    // Avg revenue per user
    const avgRevenuePerUser = activeCount > 0 ? Math.round(totalRevenue / activeCount) : 0;

    return NextResponse.json({
      mrr,
      totalRevenue,
      revenueByMonth: revenueByMonth.map((r) => ({
        month: r.month,
        amount: Number(r.amount),
      })),
      activeSubscriptions: activeCount,
      cancelledLast30d,
      avgRevenuePerUser,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/revenue" } });
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  }
}
