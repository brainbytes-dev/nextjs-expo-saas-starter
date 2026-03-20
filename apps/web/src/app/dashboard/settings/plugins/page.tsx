"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PluginCard } from "@/components/plugin-card";
import { useOrganization } from "@/hooks/use-organization";
import {
  IconPuzzle,
  IconSearch,
  IconLoader2,
} from "@tabler/icons-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PluginRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string | null;
  author: string | null;
  icon: string | null;
  category: string | null;
  isBuiltin: boolean | null;
  installed: boolean;
  enabled: boolean | null;
}

const CATEGORIES = [
  { value: "all", label: "Alle" },
  { value: "import", label: "Import" },
  { value: "export", label: "Export" },
  { value: "integration", label: "Integration" },
  { value: "utility", label: "Werkzeuge" },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PluginsMarketplacePage() {
  const router = useRouter();
  useOrganization();

  const [plugins, setPlugins] = useState<PluginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  // ── Fetch plugins ──────────────────────────────────────────────────────────

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // ── Install / Uninstall ────────────────────────────────────────────────────

  const handleInstall = async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId }),
      });
      if (res.ok) {
        await fetchPlugins();
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      const res = await fetch(`/api/plugins/${pluginId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchPlugins();
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = plugins.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const installedCount = plugins.filter((p) => p.installed).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <IconPuzzle className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Plugin Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Erweitern Sie LogistikApp mit Plugins.{" "}
            {installedCount > 0 && (
              <span className="font-medium text-foreground">
                {installedCount} installiert
              </span>
            )}
          </p>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Plugins durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Badge
              key={c.value}
              variant={category === c.value ? "default" : "outline"}
              className="cursor-pointer select-none transition-colors"
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconPuzzle className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search || category !== "all"
              ? "Keine Plugins gefunden, die Ihren Filtern entsprechen."
              : "Noch keine Plugins verfügbar."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plugin) => (
            <PluginCard
              key={plugin.id}
              id={plugin.id}
              slug={plugin.slug}
              name={plugin.name}
              description={plugin.description}
              icon={plugin.icon}
              category={plugin.category}
              author={plugin.author}
              version={plugin.version}
              installed={plugin.installed}
              enabled={plugin.enabled}
              isBuiltin={plugin.isBuiltin}
              loading={actionLoading === plugin.id}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onClick={(id) =>
                router.push(`/dashboard/settings/plugins/${id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
