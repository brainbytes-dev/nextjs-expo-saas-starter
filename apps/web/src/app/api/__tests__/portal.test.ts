import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

const mockLimit = vi.fn().mockResolvedValue({ success: true });
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    limit = mockLimit;
  },
}));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

const mockPortalCreate = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/abc" });
vi.mock("stripe", () => ({
  default: class MockStripe {
    billingPortal = { sessions: { create: mockPortalCreate } };
  },
}));

const mockSelect = vi.fn();
vi.mock("@repo/db", () => ({
  getDb: () => ({
    select: mockSelect,
  }),
  userSubscriptions: { stripeCustomerId: "stripeCustomerId", email: "email" },
  eq: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3003";

const { POST } = await import("@/app/api/portal/route");

function makeRequest(): NextRequest {
  return new Request("http://localhost:3003/api/portal", { method: "POST" }) as unknown as NextRequest;
}

describe("POST /api/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ success: true });
  });

  it("returns 401 if not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 429 if rate limited", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    mockLimit.mockResolvedValue({ success: false });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("returns 404 if no subscription found", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns portal URL when customer found", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ stripeCustomerId: "cus_abc" }]),
        }),
      }),
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://billing.stripe.com/session/abc");
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_abc" })
    );
  });
});
