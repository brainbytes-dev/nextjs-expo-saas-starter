import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { webhookSubscriptions } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { generateWebhookSecret, WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks";

// ─── GET /api/webhooks/subscriptions ─────────────────────────────────────────
// List all webhook subscriptions for the authenticated org

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const subscriptions = await db
      .select({
        id: webhookSubscriptions.id,
        url: webhookSubscriptions.url,
        events: webhookSubscriptions.events,
        isActive: webhookSubscriptions.isActive,
        lastTriggeredAt: webhookSubscriptions.lastTriggeredAt,
        failCount: webhookSubscriptions.failCount,
        createdAt: webhookSubscriptions.createdAt,
        updatedAt: webhookSubscriptions.updatedAt,
        // Intentionally omit secret from list response
      })
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.organizationId, orgId))
      .orderBy(webhookSubscriptions.createdAt);

    return NextResponse.json({ data: subscriptions });
  } catch (error) {
    console.error("GET /api/webhooks/subscriptions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook subscriptions" },
      { status: 500 }
    );
  }
}

// ─── POST /api/webhooks/subscriptions ────────────────────────────────────────
// Create a new webhook subscription

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { url, events, secret: providedSecret } = body as {
      url?: string;
      events?: string[];
      secret?: string;
    };

    // ── Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url ist erforderlich" },
        { status: 400 }
      );
    }

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Protocol not allowed");
      }
    } catch {
      return NextResponse.json(
        { error: "Ungültige URL. Nur http:// und https:// erlaubt." },
        { status: 400 }
      );
    }

    // ── Validate events
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Mindestens ein Event muss ausgewählt werden" },
        { status: 400 }
      );
    }

    const validEventSet = new Set<string>(WEBHOOK_EVENTS);
    const invalidEvents = events.filter((e) => !validEventSet.has(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Ungültige Events: ${invalidEvents.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Generate secret if not provided
    const secret =
      providedSecret && typeof providedSecret === "string" && providedSecret.length >= 16
        ? providedSecret
        : generateWebhookSecret();

    const [subscription] = await db
      .insert(webhookSubscriptions)
      .values({
        organizationId: orgId,
        url,
        secret,
        events: events as WebhookEvent[],
        isActive: true,
        failCount: 0,
      })
      .returning();

    // Return the secret only on creation — it is never returned again
    return NextResponse.json(
      { ...subscription, secretOnCreate: secret },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/webhooks/subscriptions error:", error);
    return NextResponse.json(
      { error: "Failed to create webhook subscription" },
      { status: 500 }
    );
  }
}
