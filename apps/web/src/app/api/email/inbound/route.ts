import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import {
  classifyEmail,
  parseOrderEmail,
  parseDeliveryEmail,
  parseInvoiceEmail,
  type ParsedEmailResult,
} from "@/lib/email-parser";

// ---------------------------------------------------------------------------
// HMAC Signature Verification
// ---------------------------------------------------------------------------

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// In-memory store (replace with DB in production)
// ---------------------------------------------------------------------------

export interface ParsedEmail {
  id: string;
  orgId: string;
  from: string;
  subject: string;
  receivedAt: string;
  emailType: "order" | "delivery" | "invoice" | "unknown";
  confidence: number;
  parsedData: ParsedEmailResult | null;
  status: "draft" | "accepted" | "rejected";
  rawBody: string;
}

// Exported so the parsed route can access it
const parsedEmailsStore: ParsedEmail[] = [];

export function getParsedEmails(): ParsedEmail[] {
  return parsedEmailsStore;
}

export function addParsedEmail(email: ParsedEmail): void {
  parsedEmailsStore.push(email);
}

export function updateParsedEmailStatus(
  id: string,
  status: "accepted" | "rejected"
): ParsedEmail | null {
  const email = parsedEmailsStore.find((e) => e.id === id);
  if (email) {
    email.status = status;
    return email;
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST — Inbound email webhook
// ---------------------------------------------------------------------------

/**
 * Webhook endpoint for inbound emails.
 * Accepts payloads in Resend/SendGrid inbound parse format.
 *
 * Expected body:
 * {
 *   from: string,
 *   to: string,
 *   subject: string,
 *   text: string,
 *   html?: string,
 *   attachments?: Array<{ filename: string, content: string, contentType: string }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const rawBody = await req.clone().text();
      const signature =
        req.headers.get("x-webhook-signature") ??
        req.headers.get("x-sendgrid-signature");

      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const body = await req.json();

    const {
      from,
      to,
      subject,
      text,
      html,
    } = body as {
      from: string;
      to: string;
      subject: string;
      text?: string;
      html?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        contentType: string;
      }>;
    };

    if (!from || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: from, subject" },
        { status: 400 }
      );
    }

    // Extract org slug from "to" address: inbox-{orgSlug}@logistikapp.ch
    const toMatch = to?.match(/inbox-([a-z0-9-]+)@/i);
    const orgId = toMatch?.[1] ?? "default";

    // Use plain text body, fallback to HTML stripped of tags
    const emailBody =
      text || (html ? html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ") : "");

    if (!emailBody) {
      return NextResponse.json(
        { error: "Email body is empty" },
        { status: 400 }
      );
    }

    // Get OpenAI API key from environment or org settings
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Email Parser] No OpenAI API key configured");
      return NextResponse.json(
        { error: "Email parser not configured — missing API key" },
        { status: 503 }
      );
    }

    // Step 1: Classify the email
    const classification = await classifyEmail(subject, emailBody, apiKey);

    // Step 2: Parse based on classification
    let parsedData: ParsedEmailResult | null = null;

    if (classification.type === "order" && classification.confidence >= 0.5) {
      parsedData = await parseOrderEmail(emailBody, apiKey);
    } else if (
      classification.type === "delivery" &&
      classification.confidence >= 0.5
    ) {
      parsedData = await parseDeliveryEmail(emailBody, apiKey);
    } else if (
      classification.type === "invoice" &&
      classification.confidence >= 0.5
    ) {
      parsedData = await parseInvoiceEmail(emailBody, apiKey);
    }

    // Step 3: Store the result
    const parsedEmail: ParsedEmail = {
      id: crypto.randomUUID(),
      orgId,
      from,
      subject,
      receivedAt: new Date().toISOString(),
      emailType: classification.type,
      confidence: classification.confidence,
      parsedData,
      status: "draft",
      rawBody: emailBody.slice(0, 10000), // Limit stored body size
    };

    addParsedEmail(parsedEmail);

    return NextResponse.json({
      success: true,
      id: parsedEmail.id,
      type: classification.type,
      confidence: classification.confidence,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/email/inbound" },
    });

    console.error("[Email Parser] Inbound webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process inbound email" },
      { status: 500 }
    );
  }
}
