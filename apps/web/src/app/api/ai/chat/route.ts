import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { getOrgOpenAiKey } from "@/lib/get-org-openai-key";
import { organizations } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { aiFunctionDefinitions, executeFunction } from "./functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  context?: string;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-org)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(orgId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(orgId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 20) return false;

  entry.count++;
  return true;
}

// Periodically clean up stale entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(orgName: string, context?: string): string {
  let prompt = `Du bist der LogistikApp KI-Assistent für die Organisation "${orgName}". Du hilfst bei Lagerverwaltung, Werkzeug-Tracking und Bestellwesen.

Deine Fähigkeiten:
- Materialien und Werkzeuge suchen und Informationen anzeigen
- Lagerbestände abfragen (pro Lagerort und gesamt)
- Materialien mit niedrigem Bestand (unter Meldebestand) identifizieren
- Werkzeuge mit überfälliger Wartung anzeigen
- Bestellungen bei Lieferanten erstellen
- Bestandsänderungen buchen (Zugang, Abgang, Korrektur)

Wichtige Regeln:
- Antworte IMMER auf Deutsch (Schweizer Kontext, aber Hochdeutsch)
- Sei präzise und hilfsbereit
- Verwende die dir zur Verfügung stehenden Funktionen, um Daten abzufragen oder Aktionen auszuführen
- Wenn du eine Aktion ausführst (z.B. Bestellung erstellen), bestätige was du getan hast
- Bei Unklarheiten frage nach, bevor du eine schreibende Aktion ausführst
- Formatiere Ergebnisse übersichtlich mit Aufzählungen oder Tabellen
- Erwähne relevante Links, wenn vorhanden (z.B. /dashboard/materials für Materialübersicht)
- Wenn Daten Zahlen enthalten, formatiere sie lesbar (z.B. Tausendertrennzeichen)`;

  if (context) {
    prompt += `\n\nDer Benutzer befindet sich aktuell auf: ${context}`;
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// OpenAI API Helpers
// ---------------------------------------------------------------------------

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

async function callOpenAi(
  apiKey: string,
  messages: OpenAiMessage[],
  stream: boolean
): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      tools: aiFunctionDefinitions,
      stream,
      max_tokens: 2048,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(60_000),
  });
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // Auth
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session, orgId, db } = result;

    // Rate limit
    if (!checkRateLimit(orgId)) {
      return new Response(
        JSON.stringify({
          error: "Rate-Limit erreicht. Bitte warten Sie eine Minute.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const body: ChatRequestBody = await request.json();
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nachrichten-Array ist erforderlich." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get OpenAI API key
    const apiKey = await getOrgOpenAiKey(orgId);
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Bitte hinterlegen Sie Ihren OpenAI API-Schlüssel unter Einstellungen \u2192 KI-Funktionen.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get org name for system prompt
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const orgName = org?.name ?? "Unbekannt";

    // Build messages for OpenAI
    const openAiMessages: OpenAiMessage[] = [
      { role: "system", content: buildSystemPrompt(orgName, body.context) },
      ...body.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // First call — may include tool calls
    const initialResponse = await callOpenAi(apiKey, openAiMessages, false);

    if (!initialResponse.ok) {
      const errBody = await initialResponse.text().catch(() => "");
      console.error("OpenAI API error:", initialResponse.status, errBody);

      if (initialResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error:
              "Der OpenAI API-Schlüssel ist ungültig. Bitte prüfen Sie ihn unter Einstellungen \u2192 KI-Funktionen.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Fehler bei der KI-Anfrage. Bitte versuchen Sie es erneut.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const initialJson = await initialResponse.json();
    const assistantMessage = initialJson.choices?.[0]?.message;

    // Handle tool calls (function calling loop)
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant's tool-calling message
      openAiMessages.push({
        role: "assistant",
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call and add results
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = toolCall.function.arguments;

        let fnResult: string;
        try {
          fnResult = await executeFunction(
            db,
            orgId,
            session.user.id,
            fnName,
            fnArgs
          );
        } catch (err) {
          console.error(`AI function ${fnName} error:`, err);
          fnResult = JSON.stringify({
            error: true,
            message: "Interner Fehler bei der Ausführung.",
          });
        }

        openAiMessages.push({
          role: "tool",
          content: fnResult,
          tool_call_id: toolCall.id,
        });
      }

      // Second call — stream the final response
      const streamResponse = await callOpenAi(apiKey, openAiMessages, true);

      if (!streamResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "Fehler bei der KI-Anfrage. Bitte versuchen Sie es erneut.",
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      // Extract function results for the client to show action cards
      const functionResults: { name: string; result: unknown }[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const idx = openAiMessages.findIndex(
          (m) => m.tool_call_id === toolCall.id
        );
        if (idx !== -1) {
          try {
            functionResults.push({
              name: toolCall.function.name,
              result: JSON.parse(openAiMessages[idx]!.content ?? "{}"),
            });
          } catch {
            // ignore parse errors
          }
        }
      }

      // Stream the response back with function results prepended
      return createStreamResponse(streamResponse, functionResults);
    }

    // No tool calls — stream a simple response
    // Re-do the call with streaming for consistent UX
    const streamResponse = await callOpenAi(apiKey, openAiMessages, true);

    if (!streamResponse.ok) {
      // Fallback: return the non-streamed content
      return new Response(
        JSON.stringify({
          content: assistantMessage?.content ?? "",
          functionResults: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return createStreamResponse(streamResponse, []);
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return new Response(
      JSON.stringify({
        error: "Ein unerwarteter Fehler ist aufgetreten.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ---------------------------------------------------------------------------
// Streaming Helper
// ---------------------------------------------------------------------------

function createStreamResponse(
  openAiResponse: Response,
  functionResults: { name: string; result: unknown }[]
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      // Send function results first as a special SSE event
      if (functionResults.length > 0) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "functions", data: functionResults })}\n\n`
          )
        );
      }

      const reader = openAiResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "content", data: delta.content })}\n\n`
                  )
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } catch (err) {
        console.error("Stream read error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
