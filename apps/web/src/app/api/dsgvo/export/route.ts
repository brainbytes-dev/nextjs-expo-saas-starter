import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { collectUserData } from "@/lib/dsgvo-collector";
import { toCsv } from "@/lib/dsgvo-csv";

// Simple in-memory rate limit per user (resets on restart — good enough for export)
const lastExportMap = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session } = result;

    const userId = session.user.id;

    // Rate limit check
    const lastExport = lastExportMap.get(userId);
    if (lastExport && Date.now() - lastExport < RATE_LIMIT_MS) {
      const waitMinutes = Math.ceil(
        (RATE_LIMIT_MS - (Date.now() - lastExport)) / 60_000
      );
      return NextResponse.json(
        {
          error: `Bitte warten Sie noch ${waitMinutes} Minuten bevor Sie erneut exportieren.`,
        },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

    const data = await collectUserData(userId);

    // Record export timestamp
    lastExportMap.set(userId, Date.now());

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `logistikapp-daten-export-${dateStr}.${format === "csv" ? "csv" : "json"}`;

    if (format === "csv") {
      const csv = toCsv(data);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON format
    const json = JSON.stringify(data, null, 2);
    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[DSGVO Export]", error);
    return NextResponse.json(
      { error: "Datenexport fehlgeschlagen. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
