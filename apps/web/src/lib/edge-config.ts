/**
 * Vercel Edge Config — Canary / Progressive Rollout
 *
 * Edge Config is a key-value store that reads in <1ms at the edge.
 * Use it for:
 *   - Canary deployments (route % of traffic to new version)
 *   - Kill switches (instantly disable broken features)
 *   - Runtime configuration (no redeploy needed)
 *
 * Setup:
 *   1. Create Edge Config in Vercel dashboard
 *   2. Set EDGE_CONFIG env var (auto-set when linked)
 *   3. Add items via dashboard or API
 *
 * Usage:
 *   const maintenance = await getEdgeConfig<boolean>("maintenance_mode");
 *   const rollout = await getEdgeConfig<number>("new_checkout_rollout"); // 0-100
 */

import { createClient } from "@vercel/edge-config";

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (client) return client;
  if (!process.env.EDGE_CONFIG) return null;
  client = createClient(process.env.EDGE_CONFIG);
  return client;
}

/**
 * Read a value from Edge Config (<1ms at the edge)
 */
export async function getEdgeConfig<T = unknown>(
  key: string
): Promise<T | undefined> {
  try {
    const edgeConfig = getClient();
    if (!edgeConfig) return undefined;
    return (await edgeConfig.get(key)) as T | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if a feature should be enabled for this request (canary rollout)
 *
 * Uses a percentage-based rollout stored in Edge Config.
 * The key should contain a number 0-100 representing the rollout percentage.
 *
 * @param key - Edge Config key (e.g., "new_checkout_rollout")
 * @param identifier - Stable user/session ID for consistent bucketing
 */
export async function isInCanaryRollout(
  key: string,
  identifier: string
): Promise<boolean> {
  const percentage = await getEdgeConfig<number>(key);
  if (percentage === undefined || percentage <= 0) return false;
  if (percentage >= 100) return true;

  // Deterministic hash so same user always gets same result
  const hash = simpleHash(identifier + key);
  const bucket = hash % 100;
  return bucket < percentage;
}

/**
 * Check if the app is in maintenance mode
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return (await getEdgeConfig<boolean>("maintenance_mode")) ?? false;
}

/**
 * Simple deterministic hash for consistent bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
