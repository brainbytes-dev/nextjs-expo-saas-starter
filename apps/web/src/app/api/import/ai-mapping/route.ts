import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { organizations } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { getTargetFields, type EntityType } from "@/lib/migration/templates";

// ─── POST /api/import/ai-mapping ────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const {
      columns,
      sampleRows,
      entityType,
    }: {
      columns: string[]
      sampleRows: string[][]
      entityType: EntityType
    } = body;

    if (!columns || !entityType) {
      return NextResponse.json(
        { error: "columns and entityType are required" },
        { status: 400 }
      );
    }

    // Fetch org's OpenAI API key from AI settings
    const [org] = await db
      .select({ aiSettings: organizations.aiSettings })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const aiSettings = org?.aiSettings as { openaiApiKey?: string } | null;
    const apiKey = aiSettings?.openaiApiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Kein OpenAI API-Key hinterlegt. Bitte unter Einstellungen > KI-Funktionen konfigurieren." },
        { status: 400 }
      );
    }

    // Build target fields description
    const targetFields = getTargetFields(entityType);
    const targetFieldsDescription = targetFields
      .map((f) => `- ${f.key}: ${f.label}${f.required ? " (Pflichtfeld)" : ""}`)
      .join("\n");

    // Build sample data description
    const sampleData = (sampleRows || []).slice(0, 3).map((row, i) => {
      return `Zeile ${i + 1}: ${columns.map((col, j) => `${col}="${row[j] || ""}"`).join(", ")}`;
    }).join("\n");

    const systemPrompt = `Du bist ein Daten-Mapping-Assistent für LogistikApp, eine Schweizer Inventar-Software.
Deine Aufgabe: Ordne CSV-Spalten den Zielfeldern zu.

Zielfelder für "${entityType}":
${targetFieldsDescription}

Antworte NUR als JSON-Objekt mit diesem Format:
{
  "mapping": { "CSV-Spaltenname": "zielfeld_key", ... },
  "confidence": 0.0 bis 1.0
}

Regeln:
- Ordne nur Spalten zu, bei denen du dir sicher bist
- Nicht zugeordnete Spalten auslassen
- confidence = Gesamtvertrauen (0-1)
- Beachte: Schweizer Datenformate (Semikolon-Trennung, "Stk" = Stück, etc.)`;

    const userPrompt = `CSV-Spalten: ${columns.join(", ")}

Beispieldaten:
${sampleData || "Keine Beispieldaten verfügbar"}

Ordne diese Spalten den ${entityType}-Zielfeldern zu.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "KI-Mapping fehlgeschlagen. Bitte versuchen Sie das manuelle Mapping." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort vom KI-Modell erhalten." },
        { status: 502 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        mapping: parsed.mapping || {},
        confidence: parsed.confidence || 0.5,
      });
    } catch {
      return NextResponse.json(
        { error: "KI-Antwort konnte nicht verarbeitet werden." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("POST /api/import/ai-mapping error:", error);
    return NextResponse.json(
      { error: "KI-Mapping fehlgeschlagen" },
      { status: 500 }
    );
  }
}
