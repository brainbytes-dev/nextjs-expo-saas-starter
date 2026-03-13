/**
 * Feature Flags — powered by PostHog
 *
 * Usage:
 *   Server:  const enabled = await isFeatureEnabled("new-pricing", userId)
 *   Client:  const enabled = useFeatureFlag("new-pricing")
 *
 * Define flags in PostHog dashboard → Feature Flags.
 * Supports percentage rollouts, user targeting, and A/B variants.
 */

import { getPostHogServer, posthog } from "./posthog";

// ─── Server-side ────────────────────────────────────────────

/**
 * Check if a feature flag is enabled for a user (server-side)
 */
export async function isFeatureEnabled(
  flag: string,
  distinctId: string
): Promise<boolean> {
  try {
    const client = getPostHogServer();
    return await client.isFeatureEnabled(flag, distinctId) ?? false;
  } catch {
    // Fail open — if PostHog is down, don't block features
    return false;
  }
}

/**
 * Get feature flag variant/payload (server-side)
 * Returns the variant string for multivariate flags, or true/false for boolean flags
 */
export async function getFeatureFlag(
  flag: string,
  distinctId: string
): Promise<string | boolean | undefined> {
  try {
    const client = getPostHogServer();
    return await client.getFeatureFlag(flag, distinctId) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get feature flag payload (server-side)
 * Returns the JSON payload configured in PostHog for this flag
 */
export async function getFeatureFlagPayload(
  flag: string,
  distinctId: string
): Promise<unknown> {
  try {
    const client = getPostHogServer();
    return await client.getFeatureFlagPayload(flag, distinctId);
  } catch {
    return undefined;
  }
}

// ─── Client-side (use in React components) ──────────────────

/**
 * Check if a feature flag is enabled (client-side, synchronous)
 * PostHog must be initialized first (via PostHogProvider)
 */
export function isFeatureEnabledClient(flag: string): boolean {
  if (typeof window === "undefined") return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}

/**
 * Get feature flag variant (client-side, synchronous)
 */
export function getFeatureFlagClient(
  flag: string
): string | boolean | undefined {
  if (typeof window === "undefined") return undefined;
  return posthog.getFeatureFlag(flag) ?? undefined;
}
