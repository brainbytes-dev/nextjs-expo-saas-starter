import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockChangePassword = vi.fn().mockResolvedValue({});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      changePassword: (...args: unknown[]) => mockChangePassword(...args),
    },
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { POST } = await import("@/app/api/auth/change-password/route");

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/change-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ currentPassword: "old", newPassword: "newpass123" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 if passwords are missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 if new password is too short", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(makeRequest({ currentPassword: "old", newPassword: "short" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/8 characters/);
  });

  it("changes password and returns success", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });

    const res = await POST(
      makeRequest({ currentPassword: "oldpass123", newPassword: "newpass456" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockChangePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { currentPassword: "oldpass123", newPassword: "newpass456", revokeOtherSessions: false },
      })
    );
  });
});
