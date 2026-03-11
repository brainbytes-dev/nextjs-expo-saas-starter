import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-15",
});

/**
 * POST /api/portal
 * Create a Stripe customer portal session
 * Allows customers to manage their subscriptions and billing
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // TODO: Get Stripe customer ID from user record in database
    // For now, this is a template - you'll need to store customerId when creating subscriptions
    const customerId = "cus_XXXXX"; // Get from database

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this user" },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
