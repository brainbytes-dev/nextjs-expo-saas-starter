import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendWelcomeEmail = vi.fn().mockResolvedValue(undefined);
const mockSendPaymentFailedEmail = vi.fn().mockResolvedValue(undefined);
const mockSendSubscriptionCanceledEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: (...args: unknown[]) => mockSendWelcomeEmail(...args),
  sendPaymentFailedEmail: (...args: unknown[]) => mockSendPaymentFailedEmail(...args),
  sendSubscriptionCanceledEmail: (...args: unknown[]) => mockSendSubscriptionCanceledEmail(...args),
}));

const mockExecute = vi.fn().mockResolvedValue({ count: 3 });
vi.mock("@repo/db", () => ({
  getDb: () => ({ execute: mockExecute }),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

// Minimal inngest mock — just pass through the function handler
vi.mock("@/lib/inngest", () => ({
  inngest: {
    createFunction: (
      _meta: unknown,
      _trigger: unknown,
      handler: (ctx: unknown) => unknown
    ) => handler,
  },
}));

type Handler = (ctx: unknown) => Promise<unknown>;

const { sendWelcomeEmailFn } = await import("@/inngest/send-welcome-email");
const { paymentFailedReminderFn } = await import("@/inngest/payment-failed-reminder");
const { subscriptionCanceledFn } = await import("@/inngest/subscription-canceled");
const { cleanupSessionsFn } = await import("@/inngest/cleanup-sessions");

describe("Inngest: send-welcome-email", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends welcome email and returns result", async () => {
    const result = await (sendWelcomeEmailFn as unknown as Handler)({
      event: { data: { name: "Alice", email: "alice@example.com" } },
    });

    expect(mockSendWelcomeEmail).toHaveBeenCalledWith("Alice", "alice@example.com");
    expect(result).toEqual({ sent: true, email: "alice@example.com" });
  });
});

describe("Inngest: payment-failed-reminder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends payment failed email", async () => {
    const result = await (paymentFailedReminderFn as unknown as Handler)({
      event: { data: { email: "user@example.com", invoiceId: "inv_123" } },
    });

    expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith("user@example.com");
    expect(result).toEqual({ sent: true, email: "user@example.com", invoiceId: "inv_123" });
  });

  it("skips if no email", async () => {
    const result = await (paymentFailedReminderFn as unknown as Handler)({
      event: { data: { invoiceId: "inv_123" } },
    });

    expect(mockSendPaymentFailedEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: true, reason: "no email" });
  });
});

describe("Inngest: subscription-canceled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends cancellation email", async () => {
    const result = await (subscriptionCanceledFn as unknown as Handler)({
      event: { data: { email: "user@example.com", subscriptionId: "sub_123" } },
    });

    expect(mockSendSubscriptionCanceledEmail).toHaveBeenCalledWith("user@example.com");
    expect(result).toEqual({ sent: true, email: "user@example.com", subscriptionId: "sub_123" });
  });

  it("skips if no email", async () => {
    const result = await (subscriptionCanceledFn as unknown as Handler)({
      event: { data: { subscriptionId: "sub_123" } },
    });

    expect(mockSendSubscriptionCanceledEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: true, reason: "no email" });
  });
});

describe("Inngest: cleanup-sessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes expired sessions and returns count", async () => {
    const result = await (cleanupSessionsFn as unknown as Handler)({}) as { deleted: number; timestamp: string };

    expect(mockExecute).toHaveBeenCalled();
    expect(result).toMatchObject({ deleted: 3 });
    expect(typeof result.timestamp).toBe("string");
  });
});
