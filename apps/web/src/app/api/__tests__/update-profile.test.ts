import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockGetSession = vi.fn();
const mockUpdateUser = vi.fn().mockResolvedValue({});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { POST } = await import("@/app/api/auth/update-profile/route");

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new Request("http://localhost/api/auth/update-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/update-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ name: "Alice" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 if name is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 if name is not a string", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });

    const res = await POST(makeRequest({ name: 42 }));
    expect(res.status).toBe(400);
  });

  it("updates user name and returns success", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "a@b.com", name: "Old" } });

    const res = await POST(makeRequest({ name: "Alice" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user.name).toBe("Alice");
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "Alice" } })
    );
  });
});
