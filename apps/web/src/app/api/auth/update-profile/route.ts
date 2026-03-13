import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Invalid name provided" },
        { status: 400 }
      );
    }

    await auth.api.updateUser({
      body: { name },
      headers: request.headers,
    });

    return NextResponse.json({ success: true, user: { ...session.user, name } });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "update-profile" } });
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
