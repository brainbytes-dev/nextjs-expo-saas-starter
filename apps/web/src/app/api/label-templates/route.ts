import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { labelTemplates } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const result = await getSessionAndOrg(request);
    if ("error" in result && result.error instanceof Response) {
      return result.error;
    }
    const { orgId, db } = result as { orgId: string; db: ReturnType<typeof import("@repo/db").getDb> };

    const templates = await db
      .select()
      .from(labelTemplates)
      .where(eq(labelTemplates.organizationId, orgId))
      .orderBy(labelTemplates.createdAt);

    return NextResponse.json(templates);
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "label-templates/get" } });
    return NextResponse.json({ error: "Fehler beim Laden der Vorlagen" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await getSessionAndOrg(request);
    if ("error" in result && result.error instanceof Response) {
      return result.error;
    }
    const { orgId, db } = result as { orgId: string; db: ReturnType<typeof import("@repo/db").getDb> };

    const body = await request.json();
    const { name, width, height, elements } = body;

    if (!name || !width || !height || !elements) {
      return NextResponse.json(
        { error: "Name, Breite, Höhe und Elemente sind erforderlich" },
        { status: 400 }
      );
    }

    const [template] = await db
      .insert(labelTemplates)
      .values({
        organizationId: orgId,
        name,
        width,
        height,
        elements,
      })
      .returning();

    return NextResponse.json(template);
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "label-templates/post" } });
    return NextResponse.json({ error: "Fehler beim Speichern der Vorlage" }, { status: 500 });
  }
}
