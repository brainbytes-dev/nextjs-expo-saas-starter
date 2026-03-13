import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// --- Drizzle mock ---
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
const mockSet = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockResolvedValue({});

mockInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate }) });
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });

vi.mock("@repo/db", () => ({
  getDb: () => ({ insert: mockInsert, update: mockUpdate }),
  userSubscriptions: { stripeCustomerId: "stripeCustomerId", stripeSubscriptionId: "stripeSubscriptionId" },
  payments: {},
  eq: vi.fn(),
}));

// --- Stripe mock ---
const mockConstructEvent = vi.fn();
const mockCustomersRetrieve = vi.fn().mockResolvedValue({ email: "test@example.com" });

vi.mock("stripe", () => ({
  default: class MockStripe {
    webhooks = { constructEvent: mockConstructEvent };
    customers = { retrieve: mockCustomersRetrieve };
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCanceledEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));

process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";

const { POST } = await import("@/app/api/webhooks/stripe/route");

function makeRequest(body: string, sig = "valid-sig"): NextRequest {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": sig, "Content-Type": "text/plain" },
    body,
  }) as unknown as NextRequest;
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate }),
    });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
  });

  it("returns 400 if stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("handles checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("handles customer.subscription.updated", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_123", status: "active" },
      },
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });

  it("handles customer.subscription.deleted", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_123", customer: "cus_123" },
      },
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });

  it("handles invoice.payment_succeeded", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "inv_123",
          subscription: "sub_123",
          amount_paid: 2900,
          currency: "usd",
        },
      },
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });

  it("handles invoice.payment_failed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "inv_123",
          subscription: "sub_123",
          amount_due: 2900,
          currency: "usd",
          customer_email: "user@example.com",
        },
      },
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });

  it("returns 200 for unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
  });
});
