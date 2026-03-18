import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import {
  organizations,
  organizationMembers,
  locations,
  materials,
  tools,
  keys,
} from "@repo/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSession();
    if (result.error) return result.error;
    const { session, db } = result;

    // Fetch all org memberships for this user
    const memberships = await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, session.user.id));

    if (memberships.length === 0) {
      return NextResponse.json({ orgs: [], totals: { locations: 0, materials: 0, tools: 0, keys: 0 } });
    }

    const orgIds = memberships.map((m) => m.organizationId);

    // Fetch org metadata
    const orgRows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        industry: organizations.industry,
        logo: organizations.logo,
      })
      .from(organizations)
      .where(
        // Drizzle doesn't have inArray in older versions — use raw sql
        eq(organizations.id, orgIds[0]!)
      );

    // For each org, fetch counts — done sequentially to keep it simple
    // (N orgs, typically 1-5 for a SME, so N+1 is acceptable here)
    const orgStats = await Promise.all(
      memberships.map(async (membership) => {
        const orgId = membership.organizationId;

        const [orgMeta] = await db
          .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            industry: organizations.industry,
            logo: organizations.logo,
          })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        const [locationCount] = await db
          .select({ count: count() })
          .from(locations)
          .where(
            and(
              eq(locations.organizationId, orgId),
              eq(locations.isActive, true)
            )
          );

        const [materialCount] = await db
          .select({ count: count() })
          .from(materials)
          .where(
            and(
              eq(materials.organizationId, orgId),
              eq(materials.isActive, true)
            )
          );

        const [toolCount] = await db
          .select({ count: count() })
          .from(tools)
          .where(
            and(
              eq(tools.organizationId, orgId),
              eq(tools.isActive, true)
            )
          );

        const [keyCount] = await db
          .select({ count: count() })
          .from(keys)
          .where(
            and(
              eq(keys.organizationId, orgId),
              eq(keys.isActive, true)
            )
          );

        return {
          id: orgId,
          name: orgMeta?.name ?? orgId,
          slug: orgMeta?.slug ?? "",
          industry: orgMeta?.industry ?? null,
          logo: orgMeta?.logo ?? null,
          role: membership.role,
          counts: {
            locations: Number(locationCount?.count ?? 0),
            materials: Number(materialCount?.count ?? 0),
            tools: Number(toolCount?.count ?? 0),
            keys: Number(keyCount?.count ?? 0),
          },
        };
      })
    );

    // Aggregate totals
    const totals = orgStats.reduce(
      (acc, org) => ({
        locations: acc.locations + org.counts.locations,
        materials: acc.materials + org.counts.materials,
        tools: acc.tools + org.counts.tools,
        keys: acc.keys + org.counts.keys,
      }),
      { locations: 0, materials: 0, tools: 0, keys: 0 }
    );

    return NextResponse.json({
      orgs: orgStats,
      totals,
      membershipCount: memberships.length,
    });
  } catch (error) {
    console.error("GET /api/consolidated/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch consolidated stats" },
      { status: 500 }
    );
  }
}
