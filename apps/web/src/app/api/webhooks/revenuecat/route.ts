import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { sendPaymentFailedEmail } from "@/lib/email";
import { trackEvent } from "@/lib/posthog";
import { getDb, mobileSubscriptions, eq } from "@repo/db";

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

/**
 * Verify webhook signature from RevenueCat
 * RevenueCat sends Authorization header with Bearer token
 * that must match REVENUECAT_WEBHOOK_SECRET environment variable
 */
function verifyWebhookSignature(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("REVENUECAT_WEBHOOK_SECRET not configured");
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      console.warn("Invalid RevenueCat webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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

    const db = getDb();
    const eventData = event.subscription_event_data || event;

    switch (event.type) {
      case "TEST_NOTIFICATION": {
        console.log("RevenueCat test webhook received");
        break;
      }

      case "INITIAL_PURCHASE": {
        console.log("Initial subscription purchase:", eventData.product_id);

        try {
          await db
            .insert(mobileSubscriptions)
            .values({
              revenuecatUserId: eventData.app_user_id,
              productId: eventData.product_id,
              store: eventData.store,
              status: "active",
              autoResumeDate: eventData.auto_resume_date
                ? new Date(eventData.auto_resume_date)
                : null,
              expirationDate: eventData.expiration_date
                ? new Date(eventData.expiration_date)
                : null,
              purchaseDate: eventData.purchase_date
                ? new Date(eventData.purchase_date)
                : null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: mobileSubscriptions.revenuecatUserId,
              set: {
                productId: eventData.product_id,
                store: eventData.store,
                status: "active",
                expirationDate: eventData.expiration_date
                  ? new Date(eventData.expiration_date)
                  : null,
                updatedAt: new Date(),
              },
            });

          trackEvent("mobile_subscription_started", {
            productId: eventData.product_id,
          });
        } catch (err) {
          console.error("Error processing purchase:", err);
          Sentry.captureException(err, {
            tags: { webhook: "revenuecat", event: "INITIAL_PURCHASE" },
          });
        }
        break;
      }

      case "RENEWAL": {
        console.log("Subscription renewal:", eventData.product_id);

        try {
          await db
            .update(mobileSubscriptions)
            .set({
              status: "active",
              expirationDate: eventData.expiration_date
                ? new Date(eventData.expiration_date)
                : null,
              updatedAt: new Date(),
            })
            .where(
              eq(mobileSubscriptions.revenuecatUserId, eventData.app_user_id)
            );
        } catch (err) {
          console.error("Error processing renewal:", err);
        }
        break;
      }

      case "CANCELLATION": {
        console.log("Subscription cancelled:", eventData.product_id);

        try {
          await db
            .update(mobileSubscriptions)
            .set({
              status: "canceled",
              canceledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              eq(mobileSubscriptions.revenuecatUserId, eventData.app_user_id)
            );
        } catch (err) {
          console.error("Error processing cancellation:", err);
        }
        break;
      }

      case "BILLING_ISSUE": {
        console.log("Billing issue:", eventData.product_id);

        try {
          await db
            .update(mobileSubscriptions)
            .set({ status: "payment_failed", updatedAt: new Date() })
            .where(
              eq(mobileSubscriptions.revenuecatUserId, eventData.app_user_id)
            );

          if (eventData.email) {
            try {
              await sendPaymentFailedEmail(eventData.email);
              trackEvent("mobile_payment_failed", {
                productId: eventData.product_id,
              });
            } catch (emailErr) {
              console.error("Error sending payment failed email:", emailErr);
              Sentry.captureException(emailErr, {
                tags: {
                  webhook: "revenuecat",
                  action: "send_payment_failed_email",
                },
              });
            }
          }
        } catch (err) {
          console.error("Error processing billing issue:", err);
          Sentry.captureException(err, {
            tags: { webhook: "revenuecat", event: "BILLING_ISSUE" },
          });
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
          await db
            .update(mobileSubscriptions)
            .set({ productId: eventData.new_product_id, updatedAt: new Date() })
            .where(
              eq(mobileSubscriptions.revenuecatUserId, eventData.app_user_id)
            );
        } catch (err) {
          console.error("Error processing product change:", err);
        }
        break;
      }

      case "TRANSFER": {
        console.log("Subscription transferred:", eventData.product_id);

        try {
          await db
            .update(mobileSubscriptions)
            .set({ store: eventData.store, updatedAt: new Date() })
            .where(
              eq(mobileSubscriptions.revenuecatUserId, eventData.app_user_id)
            );
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
