import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { webhookSubscriptions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { dispatchWebhookAsync } from "@/lib/webhooks";

/**
 * POST /api/webhooks/subscriptions/[id]/test
 * Sends a test payload to verify the endpoint is reachable.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [subscription] = await db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.organizationId, orgId)
        )
      )
      .limit(1);

    if (!subscription) {
      return NextResponse.json(
        { error: "Webhook-Subscription nicht gefunden" },
        { status: 404 }
      );
    }

    // Use the first subscribed event as the test event, or a generic ping
    const testEvent =
      (subscription.events[0] as Parameters<typeof dispatchWebhookAsync>[1]) ??
      "material.created";

    await dispatchWebhookAsync(orgId, testEvent, {
      test: true,
      message: "Dies ist eine Test-Zustellung von LogistikApp.",
      subscriptionId: id,
    });

    return NextResponse.json({ success: true, message: "Test-Payload gesendet" });
  } catch (error) {
    console.error("POST /api/webhooks/subscriptions/[id]/test error:", error);
    return NextResponse.json(
      { error: "Failed to send test payload" },
      { status: 500 }
    );
  }
}
