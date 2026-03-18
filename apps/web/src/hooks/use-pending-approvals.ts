"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/use-organization";

/**
 * Returns the count of pending approval requests for the active organisation.
 * Refreshes every 60 seconds automatically.
 */
export function usePendingApprovalsCount(): number {
  const { orgId } = useOrganization();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch(`/api/approvals?status=pending`, {
          headers: { "x-organization-id": orgId! },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // fail silently — badge is non-critical
      }
    }

    void fetchCount();

    const interval = setInterval(() => {
      void fetchCount();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orgId]);

  return count;
}
