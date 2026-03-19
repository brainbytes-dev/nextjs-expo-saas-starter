import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb } from "@repo/db";
import { organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function getSessionAndOrg(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }

  // Get org from header, query param, or fall back to user's first org
  let orgId =
    request.headers.get("x-organization-id") ||
    new URL(request.url).searchParams.get("orgId");

  const db = getDb();

  // Auto-resolve: if no orgId provided, use the user's first org
  if (!orgId) {
    const [firstMembership] = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, session.user.id))
      .limit(1);

    if (!firstMembership) {
      return {
        error: new Response("No organization found", { status: 400 }),
        session,
      };
    }
    orgId = firstMembership.organizationId;
  }

  const membership = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (!membership.length) {
    return {
      error: new Response("Not a member", { status: 403 }),
      session,
    };
  }

  return { session, orgId, membership: membership[0]!, db };
}

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }
  return { session, db: getDb() };
}
