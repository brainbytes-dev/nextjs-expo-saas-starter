"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOrganization } from "@/hooks/use-organization";
import {
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconTrash,
  IconPuzzle,
} from "@tabler/icons-react";
import type { PluginConfigField } from "@/lib/plugin-sdk";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PluginDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string | null;
  author: string | null;
  icon: string | null;
  category: string | null;
  configSchema: PluginConfigField[] | null;
  events: string[] | null;
  webhookUrl: string | null;
  isBuiltin: boolean | null;
  installed: boolean;
  installation: {
    id: string;
    config: Record<string, unknown> | null;
    enabled: boolean | null;
    createdAt: string;
  } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  import: "Import",
  export: "Export",
  integration: "Integration",
  utility: "Werkzeug",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PluginDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  useOrganization();

  const [plugin, setPlugin] = useState<PluginDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPlugin = useCallback(async () => {
    try {
      const res = await fetch(`/api/plugins/${params.id}`);
      if (res.ok) {
        const data: PluginDetail = await res.json();
        setPlugin(data);
        setConfigValues(
          (data.installation?.config as Record<string, unknown>) ?? {}
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPlugin();
  }, [fetchPlugin]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleInstall = async () => {
    if (!plugin) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId: plugin.id, config: configValues }),
      });
      if (res.ok) await fetchPlugin();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (!plugin) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/plugins/${plugin.id}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchPlugin();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!plugin) return;
    setSaving(true);
    try {
      await fetch(`/api/plugins/${plugin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await fetchPlugin();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!plugin) return;
    setSaving(true);
    try {
      await fetch(`/api/plugins/${plugin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configValues }),
      });
      await fetchPlugin();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Not found ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/settings/plugins")}
        >
          <IconArrowLeft className="mr-1.5 size-4" />
          Zurück
        </Button>
        <p className="text-sm text-muted-foreground">Plugin nicht gefunden.</p>
      </div>
    );
  }

  const configFields = (plugin.configSchema ?? []) as PluginConfigField[];
  const categoryLabel = plugin.category
    ? CATEGORY_LABELS[plugin.category] ?? plugin.category
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/dashboard/settings/plugins")}
      >
        <IconArrowLeft className="mr-1.5 size-4" />
        Marketplace
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          <IconPuzzle className="size-6 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{plugin.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {categoryLabel && <Badge variant="outline">{categoryLabel}</Badge>}
            {plugin.isBuiltin && <Badge variant="secondary">Built-in</Badge>}
            {plugin.version && (
              <span className="text-xs text-muted-foreground">
                v{plugin.version}
              </span>
            )}
            {plugin.author && (
              <span className="text-xs text-muted-foreground">
                von {plugin.author}
              </span>
            )}
          </div>
        </div>

        {/* Install / Uninstall button */}
        <div className="shrink-0">
          {plugin.installed ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={handleUninstall}
            >
              {actionLoading ? (
                <IconLoader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <IconTrash className="mr-1.5 size-3.5" />
              )}
              Deinstallieren
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleInstall}
            >
              {actionLoading ? (
                <IconLoader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <IconDownload className="mr-1.5 size-3.5" />
              )}
              Installieren
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Beschreibung</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {plugin.description ?? "Keine Beschreibung verfügbar."}
          </p>
        </CardContent>
      </Card>

      {/* Events */}
      {plugin.events && plugin.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unterstützte Events</CardTitle>
            <CardDescription>
              Dieses Plugin reagiert auf folgende Ereignisse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {plugin.events.map((event) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle + Config (only when installed) */}
      {plugin.installed && (
        <>
          {/* Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Plugin aktiviert</CardTitle>
                  <CardDescription>
                    Plugin ein- oder ausschalten, ohne es zu deinstallieren
                  </CardDescription>
                </div>
                <Switch
                  checked={plugin.installation?.enabled ?? true}
                  onCheckedChange={handleToggle}
                  disabled={saving}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Configuration */}
          {configFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Konfiguration</CardTitle>
                <CardDescription>
                  Einstellungen für dieses Plugin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {configFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={field.key} className="text-xs">
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5 text-destructive">*</span>
                      )}
                    </Label>
                    <Input
                      id={field.key}
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      value={String(configValues[field.key] ?? "")}
                      onChange={(e) =>
                        setConfigValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                <Button
                  size="sm"
                  disabled={saving}
                  onClick={handleSaveConfig}
                  className="mt-2"
                >
                  {saving ? (
                    <IconLoader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <IconCheck className="mr-1.5 size-3.5" />
                  )}
                  Speichern
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
