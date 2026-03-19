import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecognizeResult {
  name: string;
  manufacturer: string;
  category: string;
  description: string;
  estimatedPrice: string;
  unit: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEMO_RESULT: RecognizeResult = {
  name: "Hilti TE 70-ATC Bohrhammer",
  manufacturer: "Hilti",
  category: "Elektrowerkzeug",
  description: "Kombihammer für Beton und Mauerwerk mit Active Torque Control",
  estimatedPrice: "2450.00",
  unit: "Stk",
};

const OPENAI_VISION_PROMPT = `Identify the product, tool, or material shown in this image.
Return ONLY a JSON object with exactly these fields (no markdown, no code fences):
{
  "name": "full product name including model",
  "manufacturer": "brand or manufacturer name",
  "category": "product category in German (e.g. Elektrowerkzeug, Baumaterial, Schutzausrüstung)",
  "description": "one sentence description in German",
  "estimatedPrice": "estimated retail price as a decimal string (e.g. 199.90), or empty string if unknown",
  "unit": "unit of measure: Stk, m, kg, l, Paar, Pkg, Set, Rll, or ml"
}
If the image is unclear or not a product, still return the JSON with your best guess and empty strings for unknown fields.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callOpenAiVision(
  base64Image: string,
  mimeType: string
): Promise<RecognizeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: OPENAI_VISION_PROMPT,
            },
          ],
        },
      ],
    }),
    // Fail fast — Vision API usually responds within 10 s
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const json = await response.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";

  // Strip any accidental markdown code fences before parsing
  const cleaned = content.replace(/```(?:json)?/g, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<RecognizeResult>;

  return {
    name: parsed.name ?? "",
    manufacturer: parsed.manufacturer ?? "",
    category: parsed.category ?? "",
    description: parsed.description ?? "",
    estimatedPrice: parsed.estimatedPrice ?? "",
    unit: parsed.unit ?? "Stk",
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // Auth guard
    const result = await getSession();
    if (result.error) return result.error;

    // Check content type
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Request must be multipart/form-data" },
        { status: 400 }
      );
    }

    let formData: globalThis.FormData;
    try {
      formData = await request.formData() as unknown as globalThis.FormData;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse form data" },
        { status: 400 }
      );
    }

    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Field 'image' (file) is required" },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Image must be JPEG, PNG, or WebP" },
        { status: 415 }
      );
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 413 }
      );
    }

    // Demo / no-key fallback
    if (!process.env.OPENAI_API_KEY) {
      // Simulate slight latency so UI feels realistic in demo
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ result: DEMO_RESULT, demo: true });
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const recognizeResult = await callOpenAiVision(base64, file.type);

    return NextResponse.json({ result: recognizeResult, demo: false });
  } catch (error) {
    console.error("POST /api/ai/recognize error:", error);

    // Return demo result rather than surfacing internal errors to clients
    return NextResponse.json(
      { result: DEMO_RESULT, demo: true, fallback: true },
      { status: 200 }
    );
  }
}
