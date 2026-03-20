import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import {
  organizations,
  organizationMembers,
  materials,
  tools,
  userSubscriptions,
} from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

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

    const db = getDb();

    // Fetch all organizations with aggregated stats
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        industry: organizations.industry,
        enabledFeatures: organizations.enabledFeatures,
        planOverride: organizations.planOverride,
        adminNotes: organizations.adminNotes,
        createdAt: organizations.createdAt,
      })
      .from(organizations);

    // Get counts per organization
    const memberCounts = await db
      .select({
        organizationId: organizationMembers.organizationId,
        count: sql<number>`count(*)::int`,
      })
      .from(organizationMembers)
      .groupBy(organizationMembers.organizationId);

    const materialCounts = await db
      .select({
        organizationId: materials.organizationId,
        count: sql<number>`count(*)::int`,
      })
      .from(materials)
      .groupBy(materials.organizationId);

    const toolCounts = await db
      .select({
        organizationId: tools.organizationId,
        count: sql<number>`count(*)::int`,
      })
      .from(tools)
      .groupBy(tools.organizationId);

    // Build lookup maps
    const memberMap = new Map(memberCounts.map((m) => [m.organizationId, m.count]));
    const materialMap = new Map(materialCounts.map((m) => [m.organizationId, m.count]));
    const toolMap = new Map(toolCounts.map((m) => [m.organizationId, m.count]));

    // Get subscription plan for each org (via org members -> user -> subscription)
    // We'll match org to subscription through user memberships
    const orgSubscriptions = await db
      .select({
        organizationId: organizationMembers.organizationId,
        planId: userSubscriptions.planId,
        status: userSubscriptions.status,
      })
      .from(organizationMembers)
      .innerJoin(userSubscriptions, eq(organizationMembers.userId, userSubscriptions.userId));

    const subscriptionMap = new Map<string, string>();
    for (const sub of orgSubscriptions) {
      if (sub.status === "active" && sub.planId) {
        subscriptionMap.set(sub.organizationId, sub.planId);
      }
    }

    const result = orgs.map((org) => ({
      ...org,
      plan: org.planOverride || subscriptionMap.get(org.id) || "starter",
      userCount: memberMap.get(org.id) || 0,
      materialCount: materialMap.get(org.id) || 0,
      toolCount: toolMap.get(org.id) || 0,
    }));

    return NextResponse.json({ organizations: result });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/organizations" } });
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
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

    const body = await request.json();
    const { id, planOverride, enabledFeatures, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const db = getDb();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (planOverride !== undefined) {
      updateData.planOverride = planOverride; // null to clear override
    }
    if (enabledFeatures !== undefined) {
      updateData.enabledFeatures = enabledFeatures; // string[] or null
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/organizations/patch" } });
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
