import { createHmac, randomBytes } from "crypto";
import { getDb } from "@repo/db";
import { webhookSubscriptions } from "@repo/db/schema";
import { eq, and, arrayContains } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";

// ─── Supported Event Types ───────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  "material.created",
  "material.updated",
  "material.deleted",
  "tool.created",
  "tool.updated",
  "tool.deleted",
  "stock.changed",
  "tool.checked_out",
  "tool.checked_in",
  "commission.created",
  "commission.status_changed",
  "member.invited",
  "member.removed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookPayload {
  event: WebhookEvent;
  organizationId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Secret Generation ───────────────────────────────────────────────────────

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

// ─── HMAC Signature ──────────────────────────────────────────────────────────

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

// ─── Single Delivery Attempt ─────────────────────────────────────────────────

async function deliverWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10 s

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Timestamp": payload.timestamp,
        "User-Agent": "LogistikApp-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return { ok: res.ok, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ─── Dispatch With Retry ─────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;
const DEACTIVATE_AFTER_FAILURES = 10;

async function dispatchToSubscription(
  subscriptionId: string,
  url: string,
  secret: string,
  currentFailCount: number,
  payload: WebhookPayload
): Promise<void> {
  const db = getDb();

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await deliverWebhook(url, secret, payload);

    if (result.ok) {
      // Reset fail count and update lastTriggeredAt on success
      await db
        .update(webhookSubscriptions)
        .set({
          lastTriggeredAt: new Date(),
          failCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(webhookSubscriptions.id, subscriptionId));
      return;
    }

    lastError = result.error ?? `HTTP ${result.status}`;

    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff: 1 s, 2 s (no blocking in serverless — best effort)
      await new Promise((resolve) =>
        setTimeout(resolve, 1_000 * Math.pow(2, attempt - 1))
      );
    }
  }

  // All attempts failed — increment failCount, deactivate if threshold reached
  const newFailCount = currentFailCount + 1;
  const shouldDeactivate = newFailCount >= DEACTIVATE_AFTER_FAILURES;

  await db
    .update(webhookSubscriptions)
    .set({
      failCount: newFailCount,
      ...(shouldDeactivate ? { isActive: false } : {}),
      updatedAt: new Date(),
    })
    .where(eq(webhookSubscriptions.id, subscriptionId));

  console.error(
    `[webhooks] Delivery failed for subscription ${subscriptionId} after ${MAX_ATTEMPTS} attempts. Last error: ${lastError}. ` +
      (shouldDeactivate ? "Subscription deactivated." : `failCount=${newFailCount}`)
  );
}

// ─── Public Dispatch Function ─────────────────────────────────────────────────

/**
 * Find all active webhook subscriptions for the given org that listen on the
 * given event, then deliver the payload to each one asynchronously.
 *
 * Fire-and-forget: does not block the calling request. Individual failures are
 * logged and retried up to 3 times with exponential backoff.
 */
export function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): void {
  const payload: WebhookPayload = {
    event,
    organizationId: orgId,
    timestamp: new Date().toISOString(),
    data,
  };

  // Fire-and-forget — intentionally not awaited
  (async () => {
    try {
      const db = getDb();

      const subscriptions = await db
        .select({
          id: webhookSubscriptions.id,
          url: webhookSubscriptions.url,
          secret: webhookSubscriptions.secret,
          failCount: webhookSubscriptions.failCount,
        })
        .from(webhookSubscriptions)
        .where(
          and(
            eq(webhookSubscriptions.organizationId, orgId),
            eq(webhookSubscriptions.isActive, true),
            arrayContains(webhookSubscriptions.events, [event])
          )
        );

      await Promise.allSettled(
        subscriptions.map((sub) =>
          dispatchToSubscription(
            sub.id,
            sub.url,
            sub.secret,
            sub.failCount,
            payload
          )
        )
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { module: "webhooks", event },
        extra: { orgId },
      });
      console.error("[webhooks] dispatchWebhook error:", err);
    }
  })();
}

/**
 * Awaitable version — use when you need to know delivery completed (e.g. test
 * endpoint). Not recommended for hot paths.
 */
export async function dispatchWebhookAsync(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    organizationId: orgId,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const db = getDb();

    const subscriptions = await db
      .select({
        id: webhookSubscriptions.id,
        url: webhookSubscriptions.url,
        secret: webhookSubscriptions.secret,
        failCount: webhookSubscriptions.failCount,
      })
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.organizationId, orgId),
          eq(webhookSubscriptions.isActive, true),
          arrayContains(webhookSubscriptions.events, [event])
        )
      );

    await Promise.allSettled(
      subscriptions.map((sub) =>
        dispatchToSubscription(
          sub.id,
          sub.url,
          sub.secret,
          sub.failCount,
          payload
        )
      )
    );
  } catch (err) {
    Sentry.captureException(err, {
      tags: { module: "webhooks", event },
      extra: { orgId },
    });
    console.error("[webhooks] dispatchWebhookAsync error:", err);
  }
}
