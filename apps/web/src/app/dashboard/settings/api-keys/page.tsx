"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/use-organization";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// ─── Scope catalogue ──────────────────────────────────────────────────────────

const SCOPE_GROUPS = [
  {
    label: "Materialien",
    scopes: [
      { id: "materials:read", label: "Materialien lesen" },
      { id: "materials:write", label: "Materialien schreiben" },
    ],
  },
  {
    label: "Werkzeuge",
    scopes: [
      { id: "tools:read", label: "Werkzeuge lesen" },
      { id: "tools:write", label: "Werkzeuge schreiben" },
    ],
  },
  {
    label: "Sonstiges",
    scopes: [
      { id: "keys:read", label: "Schlüssel lesen" },
      { id: "locations:read", label: "Lagerorte lesen" },
      { id: "stock:read", label: "Bestand lesen" },
    ],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-CH", { dateStyle: "short" }).format(
    new Date(iso)
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      className="shrink-0 text-xs h-7 px-2"
    >
      {copied ? "Kopiert" : "Kopieren"}
    </Button>
  );
}

// ─── Revoke Confirm Dialog ────────────────────────────────────────────────────

function RevokeConfirmDialog({
  keyName,
  onConfirm,
  loading,
}: {
  keyName: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 px-2 text-destructive hover:text-destructive"
          disabled={loading}
        >
          {loading ? "..." : "Widerrufen"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>API-Schlüssel widerrufen?</DialogTitle>
          <DialogDescription>
            <strong>{keyName}</strong> wird permanent gelöscht. Alle
            Anwendungen, die diesen Schlüssel verwenden, verlieren sofort den
            Zugriff.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            disabled={loading}
          >
            Widerrufen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

function CreateKeyDialog({
  orgId,
  onCreated,
}: {
  orgId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((s) => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleCreate = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({ name, scopes: selectedScopes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Erstellen");
        return;
      }
      setCreatedKey(data.keyOnCreate);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    const hadKey = !!createdKey;
    setCreatedKey(null);
    setName("");
    setSelectedScopes([]);
    setError(null);
    if (hadKey) onCreated();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">+ Neuer API-Schlüssel</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API-Schlüssel erstellt</DialogTitle>
              <DialogDescription>
                Kopiere den Schlüssel jetzt — er wird nur einmal angezeigt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                API-Schlüssel
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all">
                  {createdKey}
                </code>
                <CopyButton value={createdKey} />
              </div>
              <p className="text-xs text-muted-foreground">
                Verwende diesen Schlüssel als{" "}
                <code className="font-mono bg-background border border-border px-1 rounded">
                  Authorization: Bearer &lt;schlüssel&gt;
                </code>{" "}
                Header in deinen API-Anfragen.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fertig</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Neuer API-Schlüssel</DialogTitle>
              <DialogDescription>
                Gib dem Schlüssel einen beschreibenden Namen und wähle die
                benötigten Berechtigungen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="z. B. Zapier Integration, Mobile App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Berechtigungen (Scopes)</Label>
                <div className="space-y-4 rounded-md border border-border p-3 max-h-60 overflow-y-auto">
                  {SCOPE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.scopes.map((scope) => (
                          <div key={scope.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`scope-${scope.id}`}
                              checked={selectedScopes.includes(scope.id)}
                              onCheckedChange={() => toggleScope(scope.id)}
                              disabled={saving}
                            />
                            <label
                              htmlFor={`scope-${scope.id}`}
                              className="text-sm cursor-pointer select-none"
                            >
                              {scope.label}
                              <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                                {scope.id}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !name.trim() || selectedScopes.length === 0}
              >
                {saving ? "Erstelle..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { orgId } = useOrganization();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/api-keys", {
        headers: { "x-organization-id": orgId },
      });
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json = await res.json();
      setKeys(json.data ?? []);
    } catch {
      setPageError("API-Schlüssel konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await fetch(`/api/api-keys?id=${id}`, {
        method: "DELETE",
        headers: { "x-organization-id": orgId ?? "" },
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      await loadKeys();
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Einstellungen
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">API-Schlüssel</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Erstelle API-Schlüssel, um von externen Systemen, Zapier oder eigenen
            Skripten auf deine Daten zuzugreifen.
          </p>
        </div>
        {orgId && <CreateKeyDialog orgId={orgId} onCreated={loadKeys} />}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Authentifizierung
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Sende den Schlüssel als{" "}
          <code className="font-mono text-xs bg-background border border-border px-1 rounded">
            Authorization: Bearer lapp_live_...
          </code>{" "}
          Header. Die API ist erreichbar unter{" "}
          <code className="font-mono text-xs bg-background border border-border px-1 rounded">
            /api/v1/
          </code>
          .
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground font-mono animate-pulse">
          Lade API-Schlüssel...
        </div>
      )}

      {pageError && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">
          {pageError}
        </div>
      )}

      {!loading && keys.length === 0 && !pageError && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium mb-1">
            Noch keine API-Schlüssel erstellt
          </p>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            Erstelle einen Schlüssel, um die LogistikApp API zu nutzen.
          </p>
          {orgId && <CreateKeyDialog orgId={orgId} onCreated={loadKeys} />}
        </div>
      )}

      {/* Key cards */}
      <div className="space-y-3">
        {keys.map((key) => (
          <Card key={key.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-medium">
                      {key.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 border-green-500/30 text-green-600 bg-green-500/10"
                    >
                      Aktiv
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1 font-mono">
                    {key.prefix}••••••••••••••••••••••••
                  </CardDescription>
                  <CardDescription className="text-xs mt-0.5">
                    Erstellt: {formatDate(key.createdAt)}
                    {" · "}
                    Zuletzt verwendet:{" "}
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Noch nie"}
                    {key.expiresAt && (
                      <>
                        {" · "}
                        Läuft ab: {formatDate(key.expiresAt)}
                      </>
                    )}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <RevokeConfirmDialog
                    keyName={key.name}
                    loading={revokingId === key.id}
                    onConfirm={() => handleRevoke(key.id)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {key.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
