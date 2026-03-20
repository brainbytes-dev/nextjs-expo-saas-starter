import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { orgSettings, stockChanges, auditLog } from "@repo/db/schema";
import { eq, and, lt } from "drizzle-orm";

const SETTING_KEY = "data_retention";

interface RetentionConfig {
  stockChangesMonths: number; // 0 = unlimited
  toolBookingsMonths: number;
  auditLogMonths: number;
  commentsMonths: number;
  autoCleanup: boolean;
}

const DEFAULT_CONFIG: RetentionConfig = {
  stockChangesMonths: 0,
  toolBookingsMonths: 0,
  auditLogMonths: 0,
  commentsMonths: 0,
  autoCleanup: false,
};

// GET /api/settings/data-retention
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [row] = await db
      .select()
      .from(orgSettings)
      .where(
        and(eq(orgSettings.organizationId, orgId), eq(orgSettings.key, SETTING_KEY))
      )
      .limit(1);

    const config: RetentionConfig = row
      ? { ...DEFAULT_CONFIG, ...(row.value as Partial<RetentionConfig>) }
      : DEFAULT_CONFIG;

    return NextResponse.json(config);
  } catch (error) {
    console.error("GET /api/settings/data-retention error:", error);
    return NextResponse.json(
      { error: "Einstellungen konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/data-retention
export async function PATCH(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    if (!["owner", "admin"].includes(membership.role ?? "")) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const body = await request.json();

    const config: RetentionConfig = {
      stockChangesMonths: Number(body.stockChangesMonths) || 0,
      toolBookingsMonths: Number(body.toolBookingsMonths) || 0,
      auditLogMonths: Number(body.auditLogMonths) || 0,
      commentsMonths: Number(body.commentsMonths) || 0,
      autoCleanup: Boolean(body.autoCleanup),
    };

    const [existing] = await db
      .select()
      .from(orgSettings)
      .where(
        and(eq(orgSettings.organizationId, orgId), eq(orgSettings.key, SETTING_KEY))
      )
      .limit(1);

    if (existing) {
      await db
        .update(orgSettings)
        .set({ value: config, updatedAt: new Date() })
        .where(eq(orgSettings.id, existing.id));
    } else {
      await db.insert(orgSettings).values({
        organizationId: orgId,
        key: SETTING_KEY,
        value: config,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("PATCH /api/settings/data-retention error:", error);
    return NextResponse.json(
      { error: "Einstellungen konnten nicht gespeichert werden" },
      { status: 500 }
    );
  }
}

// POST /api/settings/data-retention — manual cleanup trigger
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    if (!["owner", "admin"].includes(membership.role ?? "")) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    // Load config
    const [row] = await db
      .select()
      .from(orgSettings)
      .where(
        and(eq(orgSettings.organizationId, orgId), eq(orgSettings.key, SETTING_KEY))
      )
      .limit(1);

    const config: RetentionConfig = row
      ? { ...DEFAULT_CONFIG, ...(row.value as Partial<RetentionConfig>) }
      : DEFAULT_CONFIG;

    let totalDeleted = 0;

    // Delete old stock changes
    if (config.stockChangesMonths > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - config.stockChangesMonths);
      const deleted = await db
        .delete(stockChanges)
        .where(
          and(
            eq(stockChanges.organizationId, orgId),
            lt(stockChanges.createdAt, cutoff)
          )
        );
      totalDeleted += (deleted as { rowCount?: number }).rowCount ?? 0;
    }

    // Delete old audit log entries
    if (config.auditLogMonths > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - config.auditLogMonths);
      const deleted = await db
        .delete(auditLog)
        .where(
          and(
            eq(auditLog.organizationId, orgId),
            lt(auditLog.createdAt, cutoff)
          )
        );
      totalDeleted += (deleted as { rowCount?: number }).rowCount ?? 0;
    }

    return NextResponse.json({ deleted: totalDeleted });
  } catch (error) {
    console.error("POST /api/settings/data-retention error:", error);
    return NextResponse.json(
      { error: "Bereinigung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
