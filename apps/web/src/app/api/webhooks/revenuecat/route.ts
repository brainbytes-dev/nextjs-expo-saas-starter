import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { sendPaymentFailedEmail } from "@/lib/email";
import { trackEvent } from "@/lib/posthog";

/**
 * POST /api/webhooks/revenuecat
 * Handle RevenueCat webhook events for mobile in-app purchases
 *
 * This endpoint receives events from RevenueCat:
 * - TEST_NOTIFICATION - Test webhook
 * - INITIAL_PURCHASE - New subscription purchased
 * - RENEWAL - Subscription renewed
 * - CANCELLATION - Subscription canceled
 * - BILLING_ISSUE - Payment failed
 * - PRODUCT_CHANGE - User changed subscription plan
 * - TRANSFER - Subscription transferred from another store
 */

// Lazy initialize Supabase client (only when needed)
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseClient && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseClient;
}

/**
 * Verify webhook signature from RevenueCat
 * For now, we'll accept all webhooks in development
 * In production, implement proper signature verification
 */
function verifyWebhookSignature(request: NextRequest): boolean {
  // TODO: Implement proper signature verification
  // RevenueCat uses bearer token in Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // In production: verify token matches REVENUECAT_WEBHOOK_SECRET
  return authHeader.startsWith("Bearer ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabaseTyped(): any {
  return getSupabase();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseTyped();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      console.warn("Invalid RevenueCat webhook signature");
      // For development, still process the webhook
      // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = await request.json();
    console.log("RevenueCat webhook event:", body.event?.type);

    const event = body.event;
    if (!event) {
      return NextResponse.json(
        { error: "Missing event" },
        { status: 400 }
      );
    }

    const eventData = event.subscription_event_data || event;

    switch (event.type) {
      case "TEST_NOTIFICATION": {
        console.log("RevenueCat test webhook received");
        break;
      }

      case "INITIAL_PURCHASE": {
        console.log("Initial subscription purchase:", eventData.product_id);

        try {
          const { error } = await supabase
            .from("mobile_subscriptions")
            .upsert(
              {
                revenuecat_user_id: eventData.app_user_id,
                product_id: eventData.product_id,
                store: eventData.store, // apple, google, stripe
                status: "active",
                auto_resume_date: eventData.auto_resume_date || null,
                expiration_date: eventData.expiration_date || null,
                purchase_date: eventData.purchase_date,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "revenuecat_user_id" }
            );

          if (error) {
            console.error("Error recording subscription:", error);
            Sentry.captureException(error, { tags: { webhook: "revenuecat", event: "INITIAL_PURCHASE" } });
          } else {
            trackEvent("mobile_subscription_started", { productId: eventData.product_id });
          }
        } catch (err) {
          console.error("Error processing purchase:", err);
          Sentry.captureException(err, { tags: { webhook: "revenuecat", event: "INITIAL_PURCHASE" } });
        }
        break;
      }

      case "RENEWAL": {
        console.log("Subscription renewal:", eventData.product_id);

        try {
          const { error } = await supabase
            .from("mobile_subscriptions")
            .update({
              status: "active",
              expiration_date: eventData.expiration_date || null,
              updated_at: new Date().toISOString(),
            })
            .eq("revenuecat_user_id", eventData.app_user_id);

          if (error) {
            console.error("Error updating subscription:", error);
          }
        } catch (err) {
          console.error("Error processing renewal:", err);
        }
        break;
      }

      case "CANCELLATION": {
        console.log("Subscription cancelled:", eventData.product_id);

        try {
          const { error } = await supabase
            .from("mobile_subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("revenuecat_user_id", eventData.app_user_id);

          if (error) {
            console.error("Error canceling subscription:", error);
          }
        } catch (err) {
          console.error("Error processing cancellation:", err);
        }
        break;
      }

      case "BILLING_ISSUE": {
        console.log("Billing issue:", eventData.product_id);

        try {
          const { error } = await supabase
            .from("mobile_subscriptions")
            .update({
              status: "payment_failed",
              updated_at: new Date().toISOString(),
            })
            .eq("revenuecat_user_id", eventData.app_user_id);

          if (error) {
            console.error("Error recording billing issue:", error);
            Sentry.captureException(error, { tags: { webhook: "revenuecat", event: "BILLING_ISSUE" } });
          }

          // Send email notification to user
          if (eventData.email) {
            try {
              await sendPaymentFailedEmail(eventData.email);
              trackEvent("mobile_payment_failed", { productId: eventData.product_id });
            } catch (emailErr) {
              console.error("Error sending payment failed email:", emailErr);
              Sentry.captureException(emailErr, { tags: { webhook: "revenuecat", action: "send_payment_failed_email" } });
            }
          }
        } catch (err) {
          console.error("Error processing billing issue:", err);
          Sentry.captureException(err, { tags: { webhook: "revenuecat", event: "BILLING_ISSUE" } });
        }
        break;
      }

      case "PRODUCT_CHANGE": {
        console.log(
          "Product change from",
          eventData.old_product_id,
          "to",
          eventData.new_product_id
        );

        try {
          const { error } = await supabase
            .from("mobile_subscriptions")
            .update({
              product_id: eventData.new_product_id,
              updated_at: new Date().toISOString(),
            })
            .eq("revenuecat_user_id", eventData.app_user_id);

          if (error) {
            console.error("Error updating product:", error);
          }
        } catch (err) {
          console.error("Error processing product change:", err);
        }
        break;
      }

      case "TRANSFER": {
        console.log("Subscription transferred:", eventData.product_id);

        try {
          const { error } = await supabase
            .from("mobile_subscriptions")
            .update({
              store: eventData.store,
              updated_at: new Date().toISOString(),
            })
            .eq("revenuecat_user_id", eventData.app_user_id);

          if (error) {
            console.error("Error recording transfer:", error);
          }
        } catch (err) {
          console.error("Error processing transfer:", err);
        }
        break;
      }

      default:
        console.log(`Unhandled RevenueCat event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { webhook: "revenuecat" } });
    console.error("RevenueCat webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
