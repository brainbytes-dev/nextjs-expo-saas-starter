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

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Event Catalogue ─────────────────────────────────────────────────────────

const EVENT_GROUPS = [
  {
    label: "Material",
    events: [
      { id: "material.created", label: "Material erstellt" },
      { id: "material.updated", label: "Material aktualisiert" },
      { id: "material.deleted", label: "Material gelöscht" },
    ],
  },
  {
    label: "Werkzeug",
    events: [
      { id: "tool.created", label: "Werkzeug erstellt" },
      { id: "tool.updated", label: "Werkzeug aktualisiert" },
      { id: "tool.deleted", label: "Werkzeug gelöscht" },
      { id: "tool.checked_out", label: "Werkzeug ausgebucht" },
      { id: "tool.checked_in", label: "Werkzeug eingebucht" },
    ],
  },
  {
    label: "Bestand",
    events: [{ id: "stock.changed", label: "Bestand geändert" }],
  },
  {
    label: "Kommissionen",
    events: [
      { id: "commission.created", label: "Kommission erstellt" },
      { id: "commission.status_changed", label: "Kommissions-Status geändert" },
    ],
  },
  {
    label: "Team",
    events: [
      { id: "member.invited", label: "Mitglied eingeladen" },
      { id: "member.removed", label: "Mitglied entfernt" },
    ],
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(sub: WebhookSubscription) {
  if (!sub.isActive && sub.failCount >= 10) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5">
        Deaktiviert
      </Badge>
    );
  }
  if (!sub.isActive) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 text-muted-foreground"
      >
        Pausiert
      </Badge>
    );
  }
  if (sub.failCount > 0) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 border-orange-500/30 text-orange-600 bg-orange-500/10"
      >
        Fehler ({sub.failCount})
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1.5 border-green-500/30 text-green-600 bg-green-500/10"
    >
      Aktiv
    </Badge>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
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

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  onConfirm,
  loading,
}: {
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
          {loading ? "..." : "Löschen"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Webhook löschen?</DialogTitle>
          <DialogDescription>
            Der Webhook wird permanent gelöscht. Keine weiteren Events werden
            gesendet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
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
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

interface SubscriptionFormProps {
  initial?: WebhookSubscription;
  orgId: string;
  onSaved: () => void;
  trigger: React.ReactNode;
}

function SubscriptionFormDialog({
  initial,
  orgId,
  onSaved,
  trigger,
}: SubscriptionFormProps) {
  const isEditing = !!initial;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    initial?.events ?? []
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const endpoint = isEditing
        ? `/api/webhooks/subscriptions/${initial.id}`
        : "/api/webhooks/subscriptions";

      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify(
          isEditing
            ? { url, events: selectedEvents, isActive }
            : { url, events: selectedEvents }
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Speichern");
        return;
      }

      const data = await res.json();

      if (!isEditing && data.secretOnCreate) {
        // Show secret reveal step before closing
        setCreatedSecret(data.secretOnCreate);
        return;
      }

      setOpen(false);
      onSaved();
    } catch {
      setError("Netzwerkfehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedSecret(null);
    setError(null);
    if (!isEditing) {
      setUrl("");
      setSelectedEvents([]);
    }
    if (createdSecret) {
      onSaved();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        {createdSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>Webhook erstellt</DialogTitle>
              <DialogDescription>
                Kopiere den Secret jetzt — er wird nur einmal angezeigt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Signing Secret
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all">
                  {createdSecret}
                </code>
                <CopyButton value={createdSecret} />
              </div>
              <p className="text-xs text-muted-foreground">
                Verwende diesen Secret, um{" "}
                <code className="font-mono">X-Webhook-Signature</code>{" "}
                (HMAC-SHA256) zu verifizieren.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fertig</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Webhook bearbeiten" : "Neuer Webhook"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "URL und abonnierte Events anpassen."
                  : "Empfangs-URL eingeben und Events auswählen."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* URL */}
              <div className="space-y-1.5">
                <Label htmlFor="webhook-url">Empfangs-URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={saving}
                />
              </div>

              {/* Events */}
              <div className="space-y-2">
                <Label className="text-sm">Events</Label>
                <div className="space-y-4 rounded-md border border-border p-3 max-h-64 overflow-y-auto">
                  {EVENT_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.events.map((ev) => (
                          <div key={ev.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`ev-${ev.id}`}
                              checked={selectedEvents.includes(ev.id)}
                              onCheckedChange={() => toggleEvent(ev.id)}
                              disabled={saving}
                            />
                            <label
                              htmlFor={`ev-${ev.id}`}
                              className="text-sm cursor-pointer select-none"
                            >
                              {ev.label}
                              <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                                {ev.id}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active toggle for editing */}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={(v) => setIsActive(Boolean(v))}
                    disabled={saving}
                  />
                  <label
                    htmlFor="is-active"
                    className="text-sm cursor-pointer select-none"
                  >
                    Webhook aktiv
                  </label>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !url || selectedEvents.length === 0}
              >
                {saving
                  ? "Speichern..."
                  : isEditing
                    ? "Speichern"
                    : "Erstellen"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const { orgId } = useOrganization();
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "error">>(
    {}
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/webhooks/subscriptions", {
        headers: { "x-organization-id": orgId },
      });
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json = await res.json();
      setSubscriptions(json.data ?? []);
    } catch {
      setPageError("Webhooks konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/webhooks/subscriptions/${id}`, {
        method: "DELETE",
        headers: { "x-organization-id": orgId ?? "" },
      });
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      await loadSubscriptions();
    } finally {
      setDeletingId(null);
    }
  };

  const handleTest = async (id: string) => {
    if (!orgId) return;
    setTestingId(id);
    try {
      const res = await fetch(`/api/webhooks/subscriptions/${id}/test`, {
        method: "POST",
        headers: { "x-organization-id": orgId },
      });
      setTestResult((prev) => ({ ...prev, [id]: res.ok ? "ok" : "error" }));
      setTimeout(
        () =>
          setTestResult((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          }),
        4000
      );
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: "error" }));
    } finally {
      setTestingId(null);
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
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Empfange Echtzeit-Events in Zapier, Make oder eigene Systeme.
            LogistikApp sendet signierte POST-Requests bei jedem Event.
          </p>
        </div>
        {orgId && (
          <SubscriptionFormDialog
            orgId={orgId}
            onSaved={loadSubscriptions}
            trigger={
              <Button size="sm">+ Neuer Webhook</Button>
            }
          />
        )}
      </div>

      {/* Signature info box */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Signatur-Verifikation
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Jeder Request enthält den Header{" "}
          <code className="font-mono text-xs bg-background border border-border px-1 rounded">
            X-Webhook-Signature: sha256=&lt;hmac&gt;
          </code>
          . Berechne{" "}
          <code className="font-mono text-xs bg-background border border-border px-1 rounded">
            HMAC-SHA256(secret, body)
          </code>{" "}
          und vergleiche den Hex-Digest.
        </p>
      </div>

      {/* State feedback */}
      {loading && (
        <div className="text-sm text-muted-foreground font-mono animate-pulse">
          Lade Webhooks...
        </div>
      )}

      {pageError && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">
          {pageError}
        </div>
      )}

      {/* Empty state */}
      {!loading && subscriptions.length === 0 && !pageError && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium mb-1">
            Noch keine Webhooks konfiguriert
          </p>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            Erstelle einen Webhook, um Events an Zapier, Make oder dein eigenes
            System zu senden.
          </p>
          {orgId && (
            <SubscriptionFormDialog
              orgId={orgId}
              onSaved={loadSubscriptions}
              trigger={
                <Button variant="outline" size="sm">
                  Ersten Webhook erstellen
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Subscription cards */}
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <Card key={sub.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(sub)}
                    <CardTitle className="text-sm font-mono truncate">
                      {sub.url}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Letzter Trigger: {formatDate(sub.lastTriggeredAt)}
                    {sub.failCount > 0 && (
                      <span className="ml-3 text-orange-600">
                        {sub.failCount}{" "}
                        {sub.failCount === 1 ? "Fehler" : "Fehler"}
                      </span>
                    )}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Test button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    disabled={testingId === sub.id}
                    onClick={() => handleTest(sub.id)}
                  >
                    {testingId === sub.id
                      ? "Sende..."
                      : testResult[sub.id] === "ok"
                        ? "Gesendet"
                        : testResult[sub.id] === "error"
                          ? "Fehler"
                          : "Test senden"}
                  </Button>

                  {/* Edit button */}
                  {orgId && (
                    <SubscriptionFormDialog
                      initial={sub}
                      orgId={orgId}
                      onSaved={loadSubscriptions}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                        >
                          Bearbeiten
                        </Button>
                      }
                    />
                  )}

                  {/* Delete button */}
                  <DeleteConfirmDialog
                    loading={deletingId === sub.id}
                    onConfirm={() => handleDelete(sub.id)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Event pills */}
              <div className="flex flex-wrap gap-1">
                {sub.events.map((ev) => (
                  <span
                    key={ev}
                    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                  >
                    {ev}
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
