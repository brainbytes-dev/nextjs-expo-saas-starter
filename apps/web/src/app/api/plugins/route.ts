import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { plugins, pluginInstallations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { BUILTIN_PLUGINS } from "@/lib/plugin-registry";

// ─── GET /api/plugins — list all plugins with install status ─────────────────

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Ensure built-in plugins exist in DB
    for (const bp of BUILTIN_PLUGINS) {
      const [existing] = await db
        .select({ id: plugins.id })
        .from(plugins)
        .where(eq(plugins.slug, bp.slug))
        .limit(1);

      if (!existing) {
        await db.insert(plugins).values({
          slug: bp.slug,
          name: bp.name,
          description: bp.description,
          version: bp.version,
          author: bp.author,
          icon: bp.icon,
          category: bp.category,
          configSchema: bp.configSchema,
          events: bp.events.map((e) => e.name),
          isBuiltin: true,
          isPublished: true,
        });
      }
    }

    // Fetch all published plugins with installation status for this org
    const allPlugins = await db
      .select({
        id: plugins.id,
        slug: plugins.slug,
        name: plugins.name,
        description: plugins.description,
        version: plugins.version,
        author: plugins.author,
        icon: plugins.icon,
        category: plugins.category,
        configSchema: plugins.configSchema,
        events: plugins.events,
        isBuiltin: plugins.isBuiltin,
        createdAt: plugins.createdAt,
        // Installation info (NULL if not installed)
        installationId: pluginInstallations.id,
        enabled: pluginInstallations.enabled,
        config: pluginInstallations.config,
        installedAt: pluginInstallations.createdAt,
      })
      .from(plugins)
      .leftJoin(
        pluginInstallations,
        and(
          eq(pluginInstallations.pluginId, plugins.id),
          eq(pluginInstallations.organizationId, orgId)
        )
      )
      .where(eq(plugins.isPublished, true))
      .orderBy(plugins.name);

    const data = allPlugins.map((p) => ({
      ...p,
      installed: p.installationId !== null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/plugins error:", error);
    return NextResponse.json(
      { error: "Plugins konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// ─── POST /api/plugins — install a plugin ────────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { pluginId, config } = body as {
      pluginId: string;
      config?: Record<string, unknown>;
    };

    if (!pluginId) {
      return NextResponse.json(
        { error: "pluginId ist erforderlich" },
        { status: 400 }
      );
    }

    // Check plugin exists
    const [plugin] = await db
      .select({ id: plugins.id })
      .from(plugins)
      .where(eq(plugins.id, pluginId))
      .limit(1);

    if (!plugin) {
      return NextResponse.json(
        { error: "Plugin nicht gefunden" },
        { status: 404 }
      );
    }

    // Check not already installed
    const [existing] = await db
      .select({ id: pluginInstallations.id })
      .from(pluginInstallations)
      .where(
        and(
          eq(pluginInstallations.pluginId, pluginId),
          eq(pluginInstallations.organizationId, orgId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Plugin bereits installiert" },
        { status: 409 }
      );
    }

    const [installation] = await db
      .insert(pluginInstallations)
      .values({
        organizationId: orgId,
        pluginId,
        config: config ?? {},
        enabled: true,
        installedBy: session.user.id,
      })
      .returning();

    return NextResponse.json(installation, { status: 201 });
  } catch (error) {
    console.error("POST /api/plugins error:", error);
    return NextResponse.json(
      { error: "Plugin konnte nicht installiert werden" },
      { status: 500 }
    );
  }
}
