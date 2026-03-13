import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

// Lazy initialize Stripe client (only when needed)
let stripeClient: Stripe | null = null;

function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

/**
 * POST /api/portal
 * Create a Stripe customer portal session
 * Allows customers to manage their subscriptions and billing
 */
export async function POST() {
  try {
    // Get user for rate limiting
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Check rate limit (10 per minute per user)
    const allowed = await checkRateLimit(`portal:${user.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
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
    Sentry.captureException(error, {
      tags: { route: "/api/portal" },
    });
    console.error("Portal session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
