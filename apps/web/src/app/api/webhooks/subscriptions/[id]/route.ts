import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { webhookSubscriptions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { WEBHOOK_EVENTS, dispatchWebhookAsync, type WebhookEvent } from "@/lib/webhooks";

// ─── PATCH /api/webhooks/subscriptions/[id] ───────────────────────────────────
// Update a webhook subscription (url, events, isActive)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [existing] = await db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook-Subscription nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // ── URL
    if (body.url !== undefined) {
      if (typeof body.url !== "string") {
        return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });
      }
      try {
        const parsed = new URL(body.url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error();
        }
      } catch {
        return NextResponse.json(
          { error: "Ungültige URL. Nur http:// und https:// erlaubt." },
          { status: 400 }
        );
      }
      updates.url = body.url;
    }

    // ── Events
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json(
          { error: "Mindestens ein Event muss ausgewählt werden" },
          { status: 400 }
        );
      }
      const validEventSet = new Set<string>(WEBHOOK_EVENTS);
      const invalidEvents = body.events.filter((e: unknown) => typeof e !== "string" || !validEventSet.has(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Ungültige Events: ${invalidEvents.join(", ")}` },
          { status: 400 }
        );
      }
      updates.events = body.events as WebhookEvent[];
    }

    // ── isActive
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive muss ein Boolean sein" },
          { status: 400 }
        );
      }
      updates.isActive = body.isActive;
      // Reset fail count when manually reactivating
      if (body.isActive === true) {
        updates.failCount = 0;
      }
    }

    const [updated] = await db
      .update(webhookSubscriptions)
      .set(updates)
      .where(eq(webhookSubscriptions.id, id))
      .returning({
        id: webhookSubscriptions.id,
        url: webhookSubscriptions.url,
        events: webhookSubscriptions.events,
        isActive: webhookSubscriptions.isActive,
        lastTriggeredAt: webhookSubscriptions.lastTriggeredAt,
        failCount: webhookSubscriptions.failCount,
        createdAt: webhookSubscriptions.createdAt,
        updatedAt: webhookSubscriptions.updatedAt,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/webhooks/subscriptions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update webhook subscription" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/webhooks/subscriptions/[id] ─────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [existing] = await db
      .select({ id: webhookSubscriptions.id })
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook-Subscription nicht gefunden" },
        { status: 404 }
      );
    }

    await db
      .delete(webhookSubscriptions)
      .where(eq(webhookSubscriptions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/webhooks/subscriptions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook subscription" },
      { status: 500 }
    );
  }
}

// ─── POST /api/webhooks/subscriptions/[id]/test ──────────────────────────────
// This route handles the test payload dispatch. Named export conflicts with
// the dynamic segment, so we handle ?action=test in PATCH, or add a sub-route.
// Actually handled by a separate route file at [id]/test/route.ts.
