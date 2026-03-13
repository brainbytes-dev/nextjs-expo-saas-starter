import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";

// Better-Auth admin plugin adds listUsers/setRole at runtime.
// Cast only the admin-specific methods since the base type doesn't include plugins.
type AdminApi = {
  listUsers: (opts: {
    headers: Headers;
    query?: Record<string, unknown>;
  }) => Promise<{ users: Array<Record<string, unknown>> }>;
  setRole: (opts: {
    headers: Headers;
    body: { userId: string; role: string };
  }) => Promise<void>;
};
type UserWithRole = { id: string; email: string; role?: string };

export async function GET(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user as UserWithRole | undefined;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminApi = auth.api as unknown as AdminApi;
    const users = await adminApi.listUsers({
      headers: request.headers,
      query: { limit: 100 },
    });

    return NextResponse.json({ users: users?.users || [] });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/users" } });
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user as UserWithRole | undefined;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role || !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === user.id && role !== "admin") {
      return NextResponse.json({ error: "Cannot remove your own admin role" }, { status: 400 });
    }

    const adminApi = auth.api as unknown as AdminApi;
    await adminApi.setRole({
      headers: request.headers,
      body: { userId, role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/users/patch" } });
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
