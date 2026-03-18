// Background cron: synchronises all active ERP integrations every 6 hours.
//
// For each organization that has an active bexio or abacus token, runs a
// full sync in the configured direction (import | export | both).
// Results are persisted to integration_tokens.last_sync_result and logged.

import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import { integrationTokens } from "@repo/db/schema";
import { syncBexio } from "@/lib/integrations/bexio";
import { syncAbacus } from "@/lib/integrations/abacus";

export const syncIntegrationsFn = inngest.createFunction(
  {
    id: "sync-integrations",
    retries: 1,
    // Concurrency limit: one sync run at a time to avoid hammering external APIs
    concurrency: { limit: 1 },
  },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const db = getDb();

    // Fetch all active integration tokens
    const tokens = await step.run("load-tokens", async () => {
      return db
        .select({
          id: integrationTokens.id,
          organizationId: integrationTokens.organizationId,
          provider: integrationTokens.provider,
          syncDirection: integrationTokens.syncDirection,
        })
        .from(integrationTokens);
    });

    const results: Array<{
      orgId: string;
      provider: string;
      status: "ok" | "error";
      summary?: string;
      error?: string;
    }> = [];

    for (const token of tokens) {
      const { organizationId: orgId, provider, syncDirection } = token;
      const direction = (syncDirection ?? "both") as "import" | "export" | "both";

      if (provider === "bexio") {
        const outcome = await step.run(
          `sync-bexio-${orgId}`,
          async () => {
            try {
              const result = await syncBexio(orgId, direction);
              return {
                orgId,
                provider: "bexio",
                status: "ok" as const,
                summary: `+${result.created} neu, ~${result.updated} aktualisiert, ${result.skipped} übersprungen, ${result.errors.length} Fehler`,
              };
            } catch (err) {
              return {
                orgId,
                provider: "bexio",
                status: "error" as const,
                error: (err as Error).message,
              };
            }
          }
        );
        results.push(outcome);
      } else if (provider === "abacus") {
        const outcome = await step.run(
          `sync-abacus-${orgId}`,
          async () => {
            try {
              const result = await syncAbacus(orgId, direction);
              return {
                orgId,
                provider: "abacus",
                status: "ok" as const,
                summary: `+${result.created} neu, ~${result.updated} aktualisiert, ${result.skipped} übersprungen, ${result.errors.length} Fehler`,
              };
            } catch (err) {
              return {
                orgId,
                provider: "abacus",
                status: "error" as const,
                error: (err as Error).message,
              };
            }
          }
        );
        results.push(outcome);
      }
    }

    const successful = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status === "error").length;

    console.log(
      `[sync-integrations] ${tokens.length} Integrationen verarbeitet — ${successful} erfolgreich, ${failed} Fehler`
    );

    for (const r of results) {
      if (r.status === "error") {
        console.error(
          `[sync-integrations] ${r.provider} org=${r.orgId} Fehler: ${r.error}`
        );
      } else {
        console.log(
          `[sync-integrations] ${r.provider} org=${r.orgId}: ${r.summary}`
        );
      }
    }

    return {
      processed: tokens.length,
      successful,
      failed,
      results,
      timestamp: new Date().toISOString(),
    };
  }
);
