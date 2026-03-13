import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { sendPaymentFailedEmail, sendSubscriptionCanceledEmail } from "@/lib/email";
import { trackEvent } from "@/lib/posthog";
import { getDb, userSubscriptions, payments, eq } from "@repo/db";

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
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * This endpoint receives events from Stripe:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed:", session.id);

        if (session.customer && session.subscription) {
          try {
            const customer = await stripe.customers.retrieve(
              session.customer as string
            );
            const customerEmail = "deleted" in customer ? null : customer.email;

            await db
              .insert(userSubscriptions)
              .values({
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                status: "active",
                email: customerEmail,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: userSubscriptions.stripeCustomerId,
                set: {
                  stripeSubscriptionId: session.subscription as string,
                  status: "active",
                  email: customerEmail,
                  updatedAt: new Date(),
                },
              });

            if (customerEmail && typeof session.subscription === "string") {
              trackEvent("subscription_started", {
                email: customerEmail,
                subscriptionId: session.subscription,
              });
            }
          } catch (err) {
            console.error("Error processing checkout session:", err);
            Sentry.captureException(err, {
              tags: { webhook: "stripe", event: "checkout.session.completed" },
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", subscription.id);

        try {
          await db
            .update(userSubscriptions)
            .set({ status: subscription.status, updatedAt: new Date() })
            .where(
              eq(userSubscriptions.stripeSubscriptionId, subscription.id)
            );
        } catch (err) {
          console.error("Error processing subscription update:", err);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription deleted:", subscription.id);

        try {
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          const customerEmail = "deleted" in customer ? null : customer.email;

          await db
            .update(userSubscriptions)
            .set({
              status: "canceled",
              canceledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              eq(userSubscriptions.stripeSubscriptionId, subscription.id)
            );

          if (customerEmail) {
            try {
              await sendSubscriptionCanceledEmail(customerEmail);
              trackEvent("subscription_canceled", {
                email: customerEmail,
                subscriptionId: subscription.id,
              });
            } catch (emailErr) {
              console.error("Error sending cancellation email:", emailErr);
              Sentry.captureException(emailErr, {
                tags: { webhook: "stripe", action: "send_cancellation_email" },
              });
            }
          }
        } catch (err) {
          console.error("Error processing subscription deletion:", err);
          Sentry.captureException(err, {
            tags: { webhook: "stripe", event: "customer.subscription.deleted" },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice paid:", invoice.id);

        try {
          await db.insert(payments).values({
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: invoice.subscription as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            paidAt: new Date(),
          });
        } catch (err) {
          console.error("Error processing payment succeeded:", err);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment failed:", invoice.id);

        try {
          await db.insert(payments).values({
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: invoice.subscription as string,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: "failed",
            failedAt: new Date(),
          });

          if (invoice.customer_email) {
            try {
              await sendPaymentFailedEmail(invoice.customer_email);
              trackEvent("payment_failed", {
                email: invoice.customer_email,
                invoiceId: invoice.id,
              });
            } catch (emailErr) {
              console.error("Error sending payment failed email:", emailErr);
              Sentry.captureException(emailErr, {
                tags: {
                  webhook: "stripe",
                  action: "send_payment_failed_email",
                },
              });
            }
          }
        } catch (err) {
          console.error("Error processing payment failed:", err);
          Sentry.captureException(err, {
            tags: { webhook: "stripe", event: "invoice.payment_failed" },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { webhook: "stripe" } });
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
