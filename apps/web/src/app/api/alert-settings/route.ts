import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { alertSettings } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { sendWhatsAppAlert } from "@/lib/whatsapp";

// GET  /api/alert-settings
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [settings] = await db
      .select()
      .from(alertSettings)
      .where(eq(alertSettings.organizationId, orgId))
      .limit(1);

    // Return defaults if no row yet
    return NextResponse.json(
      settings ?? {
        id: null,
        organizationId: orgId,
        whatsappPhone: null,
        emailAlerts: true,
        whatsappAlerts: false,
        lowStockThreshold: 1,
        maintenanceAlertDays: 7,
        autoReorder: false,
        reorderTargetMultiplier: 2,
      }
    );
  } catch (error) {
    console.error("GET /api/alert-settings error:", error);
    return NextResponse.json({ error: "Failed to fetch alert settings" }, { status: 500 });
  }
}

// PUT  /api/alert-settings
export async function PUT(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json() as {
      whatsappPhone?: string | null;
      emailAlerts?: boolean;
      whatsappAlerts?: boolean;
      lowStockThreshold?: number;
      maintenanceAlertDays?: number;
      autoReorder?: boolean;
      reorderTargetMultiplier?: number;
    };

    const values = {
      organizationId: orgId,
      whatsappPhone: body.whatsappPhone ?? null,
      emailAlerts: body.emailAlerts ?? true,
      whatsappAlerts: body.whatsappAlerts ?? false,
      lowStockThreshold: Math.max(0, Number(body.lowStockThreshold ?? 1)),
      maintenanceAlertDays: Math.max(1, Number(body.maintenanceAlertDays ?? 7)),
      autoReorder: body.autoReorder ?? false,
      reorderTargetMultiplier: Math.max(1, Math.min(10, Number(body.reorderTargetMultiplier ?? 2))),
      updatedAt: new Date(),
    };

    // Upsert via insert + onConflictDoUpdate
    const [saved] = await db
      .insert(alertSettings)
      .values({ ...values, createdAt: new Date() })
      .onConflictDoUpdate({
        target: alertSettings.organizationId,
        set: values,
      })
      .returning();

    return NextResponse.json(saved);
  } catch (error) {
    console.error("PUT /api/alert-settings error:", error);
    return NextResponse.json({ error: "Failed to save alert settings" }, { status: 500 });
  }
}

// POST /api/alert-settings/test  — send a test WhatsApp message
// Handled via a separate sub-route below
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { orgId, db } = result;

    const body = await request.json() as { phone?: string };
    const phone = body.phone?.trim();

    if (!phone) {
      return NextResponse.json({ error: "Telefonnummer fehlt" }, { status: 400 });
    }

    // Respect saved whatsapp_alerts toggle — but for a test we always send
    const sendResult = await sendWhatsAppAlert(
      phone,
      "Testnachricht von LogistikApp: Deine WhatsApp-Benachrichtigungen sind aktiv."
    );

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error ?? "Senden fehlgeschlagen" },
        { status: 500 }
      );
    }

    // Satisfy unused variable lint (orgId is verified via getSessionAndOrg)
    void db;
    void orgId;

    return NextResponse.json({ success: true, sid: sendResult.sid });
  } catch (error) {
    console.error("POST /api/alert-settings (test) error:", error);
    return NextResponse.json({ error: "Failed to send test message" }, { status: 500 });
  }
}
