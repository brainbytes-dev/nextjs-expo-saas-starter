import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { getDb, payments, users, userSubscriptions, desc, eq } from "@repo/db";

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
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
    const statusFilter = searchParams.get("status");

    const conditions = statusFilter ? eq(payments.status, statusFilter) : undefined;

    const rows = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        stripeInvoiceId: payments.stripeInvoiceId,
        stripeSubscriptionId: payments.stripeSubscriptionId,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        userName: users.name,
        userEmail: users.email,
        planId: userSubscriptions.planId,
        subscriptionStatus: userSubscriptions.status,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .leftJoin(
        userSubscriptions,
        eq(payments.stripeSubscriptionId, userSubscriptions.stripeSubscriptionId)
      )
      .where(conditions)
      .orderBy(desc(payments.createdAt))
      .limit(limit);

    return NextResponse.json({ payments: rows });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/payments" } });
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
