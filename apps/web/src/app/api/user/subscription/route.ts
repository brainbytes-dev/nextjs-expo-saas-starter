import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, userSubscriptions, eq } from "@repo/db";
import { DEMO_MODE } from "@/lib/demo-mode";

/**
 * GET /api/user/subscription
 * Returns the current user's Stripe subscription status
 */
export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ status: null });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const [sub] = await db
      .select({ status: userSubscriptions.status })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.email, session.user.email))
      .limit(1);

    return NextResponse.json({ status: sub?.status ?? null });
  } catch {
    return NextResponse.json({ status: null });
  }
}
