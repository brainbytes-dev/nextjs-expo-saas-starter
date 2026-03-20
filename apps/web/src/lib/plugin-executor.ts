import { eq, and } from "drizzle-orm";
import { plugins, pluginInstallations } from "@repo/db/schema";
import type { Database } from "@repo/db";
import type { PluginExecutionContext, PluginExecutionResult } from "./plugin-sdk";

// ─── HMAC-SHA256 Signature ──────────────────────────────────────────────────

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Plugin Executor ────────────────────────────────────────────────────────

/**
 * Execute a plugin by POSTing the event payload to its webhookUrl.
 * The request is signed with HMAC-SHA256 using the plugin slug as secret
 * (in production this would be a per-installation secret).
 */
export async function executePlugin(
  db: Database,
  pluginId: string,
  orgId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<PluginExecutionResult> {
  const start = Date.now();

  try {
    // Load plugin
    const [plugin] = await db
      .select()
      .from(plugins)
      .where(eq(plugins.id, pluginId))
      .limit(1);

    if (!plugin) {
      return {
        success: false,
        pluginId,
        event,
        message: "Plugin nicht gefunden",
      };
    }

    // Load installation + config
    const [installation] = await db
      .select()
      .from(pluginInstallations)
      .where(
        and(
          eq(pluginInstallations.pluginId, pluginId),
          eq(pluginInstallations.organizationId, orgId)
        )
      )
      .limit(1);

    if (!installation || !installation.enabled) {
      return {
        success: false,
        pluginId,
        event,
        message: "Plugin nicht installiert oder deaktiviert",
      };
    }

    // Check if plugin has a webhook URL
    const webhookUrl = plugin.webhookUrl;
    if (!webhookUrl) {
      // Built-in plugins without webhook — treat as success (handled internally)
      return {
        success: true,
        pluginId,
        event,
        message: "Built-in Plugin — kein Webhook nötig",
        duration: Date.now() - start,
      };
    }

    // Build context
    const context: PluginExecutionContext = {
      pluginId: plugin.id,
      organizationId: orgId,
      event,
      config: (installation.config as Record<string, unknown>) ?? {},
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify({ context, payload });

    // Sign with HMAC-SHA256
    const secret = plugin.slug; // In production: per-installation secret
    const signature = await signPayload(body, secret);

    // POST to webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Plugin-Signature": `sha256=${signature}`,
        "X-Plugin-Event": event,
        "X-Plugin-Id": plugin.id,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    return {
      success: response.ok,
      pluginId,
      event,
      statusCode: response.status,
      message: response.ok
        ? "Webhook erfolgreich ausgeliefert"
        : `Webhook fehlgeschlagen: HTTP ${response.status}`,
      duration: Date.now() - start,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return {
      success: false,
      pluginId,
      event,
      message: `Ausführungsfehler: ${message}`,
      duration: Date.now() - start,
    };
  }
}
