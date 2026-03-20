import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { userSubscriptions, organizations } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { stripePlanIdToPlanId, getPlanDisplayName, type PlanId } from "@/lib/plans";

// Demo account email — always returns "enterprise" plan (show all features in demos)
const DEMO_EMAIL = "demo@logistikapp.ch";

// ─── GET /api/subscription/status ────────────────────────────────────────────
// Returns the current plan + enabled features for the authenticated user's org.

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session, db, orgId } = result;

    const email = session.user.email;

    // Fetch org for planOverride + enabledFeatures
    const [org] = await db
      .select({
        planOverride: organizations.planOverride,
        enabledFeatures: organizations.enabledFeatures,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const enabledFeatures = (Array.isArray(org?.enabledFeatures) ? org.enabledFeatures : []) as string[];

    // Demo account: always enterprise with all features
    if (email === DEMO_EMAIL) {
      return NextResponse.json({
        planId: "enterprise" as PlanId,
        planName: getPlanDisplayName("enterprise"),
        status: "active",
        expiresAt: null,
        enabledFeatures,
      });
    }

    // Admin override: if planOverride is set, use it directly
    if (org?.planOverride) {
      const overridePlan = org.planOverride as PlanId;
      return NextResponse.json({
        planId: overridePlan,
        planName: getPlanDisplayName(overridePlan),
        status: "active",
        expiresAt: null,
        enabledFeatures,
      });
    }

    // Look up user_subscriptions for this user
    const [subscription] = await db
      .select({
        status: userSubscriptions.status,
        planId: userSubscriptions.planId,
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, session.user.id))
      .limit(1);

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({
        planId: "starter" as PlanId,
        planName: getPlanDisplayName("starter"),
        status: subscription?.status ?? "none",
        expiresAt: null,
        enabledFeatures,
      });
    }

    const planId = stripePlanIdToPlanId(subscription.planId);

    return NextResponse.json({
      planId,
      planName: getPlanDisplayName(planId),
      status: subscription.status,
      expiresAt: null,
      enabledFeatures,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json({
      planId: "starter" as PlanId,
      planName: getPlanDisplayName("starter"),
      status: "error",
      expiresAt: null,
      enabledFeatures: [],
    });
  }
}
