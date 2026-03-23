import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({ id: "test-email-id" });

vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

process.env.RESEND_API_KEY = "re_test_key";
process.env.RESEND_FROM_EMAIL = "test@example.com";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

const { sendWelcomeEmail, sendPaymentFailedEmail, sendSubscriptionCanceledEmail } =
  await import("@/lib/email");

describe("email", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("sendWelcomeEmail sends with correct params", async () => {
    await sendWelcomeEmail("John", "john@example.com");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "john@example.com",
        subject: "Willkommen bei Zentory, John!",
      })
    );
  });

  it("sendPaymentFailedEmail sends with correct params", async () => {
    await sendPaymentFailedEmail("user@example.com");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Zahlung fehlgeschlagen — Handlungsbedarf",
      })
    );
  });

  it("sendSubscriptionCanceledEmail sends with correct params", async () => {
    await sendSubscriptionCanceledEmail("user@example.com");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Abo gekündigt",
      })
    );
  });
});
