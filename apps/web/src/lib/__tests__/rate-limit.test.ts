import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: class MockRatelimit {
      static slidingWindow() {
        return { type: "slidingWindow" };
      }
      limit = mockLimit;
    },
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {},
}));

process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

const { checkRateLimit, getRateLimitInfo } = await import("@/lib/rate-limit");

describe("rate-limit", () => {
  beforeEach(() => {
    mockLimit.mockClear();
  });

  it("checkRateLimit returns true when under limit", async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
    const result = await checkRateLimit("user-123");
    expect(result).toBe(true);
    expect(mockLimit).toHaveBeenCalledWith("user-123");
  });

  it("checkRateLimit returns false when over limit", async () => {
    mockLimit.mockResolvedValue({ success: false, remaining: 0, reset: 60 });
    const result = await checkRateLimit("user-123");
    expect(result).toBe(false);
  });

  it("checkRateLimit fails open on error", async () => {
    mockLimit.mockRejectedValue(new Error("Redis down"));
    const result = await checkRateLimit("user-123");
    expect(result).toBe(true);
  });

  it("getRateLimitInfo returns full info", async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 5, reset: 30 });
    const info = await getRateLimitInfo("user-123");
    expect(info.success).toBe(true);
    expect(info.remaining).toBe(5);
    expect(info.reset).toBe(30);
  });

  it("getRateLimitInfo returns defaults on error", async () => {
    mockLimit.mockRejectedValue(new Error("Redis down"));
    const info = await getRateLimitInfo("user-123");
    expect(info.success).toBe(true);
    expect(info.remaining).toBe(10);
  });
});
