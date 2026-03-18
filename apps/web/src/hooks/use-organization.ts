"use client";

import { useState, useEffect } from "react";

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: string | null;
}

interface UseOrganizationResult {
  org: OrgSummary | null;
  orgId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the user's first (active) organization from /api/organizations.
 * Mirrors the pattern used in the team settings page.
 */
export function useOrganization(): UseOrganizationResult {
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/organizations");
        if (!res.ok) throw new Error("Organisations-Daten konnten nicht geladen werden");
        const orgs: OrgSummary[] = await res.json();
        if (!cancelled) {
          setOrg(orgs[0] ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Fehler beim Laden");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return { org, orgId: org?.id ?? null, loading, error };
}
