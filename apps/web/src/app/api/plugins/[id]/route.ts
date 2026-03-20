import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { plugins, pluginInstallations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ─── GET /api/plugins/:id — plugin detail ────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [plugin] = await db
      .select()
      .from(plugins)
      .where(eq(plugins.id, id))
      .limit(1);

    if (!plugin) {
      return NextResponse.json(
        { error: "Plugin nicht gefunden" },
        { status: 404 }
      );
    }

    // Check installation status
    const [installation] = await db
      .select()
      .from(pluginInstallations)
      .where(
        and(
          eq(pluginInstallations.pluginId, id),
          eq(pluginInstallations.organizationId, orgId)
        )
      )
      .limit(1);

    return NextResponse.json({
      ...plugin,
      installed: !!installation,
      installation: installation ?? null,
    });
  } catch (error) {
    console.error("GET /api/plugins/:id error:", error);
    return NextResponse.json(
      { error: "Plugin konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/plugins/:id — update config or toggle enabled ────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { config, enabled } = body as {
      config?: Record<string, unknown>;
      enabled?: boolean;
    };

    const [installation] = await db
      .select()
      .from(pluginInstallations)
      .where(
        and(
          eq(pluginInstallations.pluginId, id),
          eq(pluginInstallations.organizationId, orgId)
        )
      )
      .limit(1);

    if (!installation) {
      return NextResponse.json(
        { error: "Plugin nicht installiert" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (config !== undefined) updates.config = config;
    if (enabled !== undefined) updates.enabled = enabled;

    const [updated] = await db
      .update(pluginInstallations)
      .set(updates)
      .where(eq(pluginInstallations.id, installation.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/plugins/:id error:", error);
    return NextResponse.json(
      { error: "Plugin konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/plugins/:id — uninstall plugin ──────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [installation] = await db
      .select({ id: pluginInstallations.id })
      .from(pluginInstallations)
      .where(
        and(
          eq(pluginInstallations.pluginId, id),
          eq(pluginInstallations.organizationId, orgId)
        )
      )
      .limit(1);

    if (!installation) {
      return NextResponse.json(
        { error: "Plugin nicht installiert" },
        { status: 404 }
      );
    }

    await db
      .delete(pluginInstallations)
      .where(eq(pluginInstallations.id, installation.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/plugins/:id error:", error);
    return NextResponse.json(
      { error: "Plugin konnte nicht deinstalliert werden" },
      { status: 500 }
    );
  }
}
