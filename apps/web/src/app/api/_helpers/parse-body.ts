import { NextResponse } from "next/server";

export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ data: T } | { error: Response }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
