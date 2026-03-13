import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// --- Drizzle mock ---
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
const mockSet = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockResolvedValue({});

mockInsert.mockReturnValue({
  values: vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate }),
});
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });

vi.mock("@repo/db", () => ({
  getDb: () => ({ insert: mockInsert, update: mockUpdate }),
  mobileSubscriptions: { revenuecatUserId: "revenuecatUserId" },
  eq: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));

process.env.REVENUECAT_WEBHOOK_SECRET = "rc_secret";

const { POST } = await import("@/app/api/webhooks/revenuecat/route");

function makeRequest(event: Record<string, unknown>): NextRequest {
  return new Request("http://localhost/api/webhooks/revenuecat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer rc_secret",
    },
    body: JSON.stringify({ event }),
  }) as unknown as NextRequest;
}

describe("POST /api/webhooks/revenuecat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate }),
    });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
  });

  it("returns 401 if signature is invalid", async () => {
    const req = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer wrong" },
      body: JSON.stringify({ event: { type: "TEST_NOTIFICATION" } }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if event is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/revenuecat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer rc_secret" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("handles TEST_NOTIFICATION", async () => {
    const res = await POST(makeRequest({ type: "TEST_NOTIFICATION" }));
    expect(res.status).toBe(200);
  });

  it("handles INITIAL_PURCHASE", async () => {
    const res = await POST(
      makeRequest({
        type: "INITIAL_PURCHASE",
        app_user_id: "user_123",
        product_id: "monthly_pro",
        store: "apple",
      })
    );
    expect(res.status).toBe(200);
  });

  it("handles RENEWAL", async () => {
    const res = await POST(
      makeRequest({
        type: "RENEWAL",
        app_user_id: "user_123",
        product_id: "monthly_pro",
      })
    );
    expect(res.status).toBe(200);
  });

  it("handles CANCELLATION", async () => {
    const res = await POST(
      makeRequest({
        type: "CANCELLATION",
        app_user_id: "user_123",
        product_id: "monthly_pro",
      })
    );
    expect(res.status).toBe(200);
  });

  it("handles BILLING_ISSUE and sends email", async () => {
    const { sendPaymentFailedEmail } = await import("@/lib/email");

    const res = await POST(
      makeRequest({
        type: "BILLING_ISSUE",
        app_user_id: "user_123",
        product_id: "monthly_pro",
        email: "user@example.com",
      })
    );

    expect(res.status).toBe(200);
    expect(sendPaymentFailedEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("handles PRODUCT_CHANGE", async () => {
    const res = await POST(
      makeRequest({
        type: "PRODUCT_CHANGE",
        app_user_id: "user_123",
        old_product_id: "monthly_pro",
        new_product_id: "annual_pro",
      })
    );
    expect(res.status).toBe(200);
  });

  it("handles TRANSFER", async () => {
    const res = await POST(
      makeRequest({
        type: "TRANSFER",
        app_user_id: "user_123",
        product_id: "monthly_pro",
        store: "google",
      })
    );
    expect(res.status).toBe(200);
  });
});
