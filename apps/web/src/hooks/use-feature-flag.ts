"use client";

import { useEffect, useState } from "react";
import { posthog } from "@/lib/posthog";

/**
 * React hook for feature flags (client-side)
 *
 * Usage:
 *   const showNewPricing = useFeatureFlag("new-pricing");
 *   const variant = useFeatureFlagVariant("checkout-flow"); // "control" | "variant-a" | ...
 */

export function useFeatureFlag(flag: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check immediately
    setEnabled(posthog.isFeatureEnabled(flag) ?? false);

    // Re-check when flags are loaded/updated
    const unsubscribe = posthog.onFeatureFlags(() => {
      setEnabled(posthog.isFeatureEnabled(flag) ?? false);
    });

    return () => {
      unsubscribe?.();
    };
  }, [flag]);

  return enabled;
}

export function useFeatureFlagVariant(
  flag: string
): string | boolean | undefined {
  const [variant, setVariant] = useState<string | boolean | undefined>(
    undefined
  );

  useEffect(() => {
    setVariant(posthog.getFeatureFlag(flag) ?? undefined);

    const unsubscribe = posthog.onFeatureFlags(() => {
      setVariant(posthog.getFeatureFlag(flag) ?? undefined);
    });

    return () => {
      unsubscribe?.();
    };
  }, [flag]);

  return variant;
}
