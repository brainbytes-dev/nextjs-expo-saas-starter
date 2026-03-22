"use client";

import { useTranslations } from "next-intl";
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

const EVENT_GROUP_KEYS = [
  {
    labelKey: "evGroupMaterial",
    events: [
      { id: "material.created", labelKey: "evMaterialCreated" },
      { id: "material.updated", labelKey: "evMaterialUpdated" },
      { id: "material.deleted", labelKey: "evMaterialDeleted" },
    ],
  },
  {
    labelKey: "evGroupTool",
    events: [
      { id: "tool.created", labelKey: "evToolCreated" },
      { id: "tool.updated", labelKey: "evToolUpdated" },
      { id: "tool.deleted", labelKey: "evToolDeleted" },
      { id: "tool.checked_out", labelKey: "evToolCheckedOut" },
      { id: "tool.checked_in", labelKey: "evToolCheckedIn" },
    ],
  },
  {
    labelKey: "evGroupStock",
    events: [{ id: "stock.changed", labelKey: "evStockChanged" }],
  },
  {
    labelKey: "evGroupCommissions",
    events: [
      { id: "commission.created", labelKey: "evCommissionCreated" },
      { id: "commission.status_changed", labelKey: "evCommissionStatusChanged" },
    ],
  },
  {
    labelKey: "evGroupTeam",
    events: [
      { id: "member.invited", labelKey: "evMemberInvited" },
      { id: "member.removed", labelKey: "evMemberRemoved" },
    ],
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ sub }: { sub: WebhookSubscription }) {
  const t = useTranslations("settings");
  if (!sub.isActive && sub.failCount >= 10) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5">
        {t("statusDeactivated")}
      </Badge>
    );
  }
  if (!sub.isActive) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
        {t("statusPaused")}
      </Badge>
    );
  }
  if (sub.failCount > 0) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 border-orange-500/30 text-orange-600 bg-orange-500/10">
        {t("statusErrors", { count: sub.failCount })}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 border-green-500/30 text-green-600 bg-green-500/10">
      {t("statusActive")}
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
  const t = useTranslations("settings");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0 text-xs h-7 px-2">
      {copied ? t("copied") : t("copy")}
    </Button>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({ onConfirm, loading }: { onConfirm: () => void; loading: boolean }) {
  const t = useTranslations("settings");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-destructive hover:text-destructive" disabled={loading}>
          {loading ? "..." : t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deleteWebhookTitle")}</DialogTitle>
          <DialogDescription>{t("deleteWebhookDesc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("cancel")}</Button>
          <Button variant="destructive" onClick={() => { setOpen(false); onConfirm(); }} disabled={loading}>{t("delete")}</Button>
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

function SubscriptionFormDialog({ initial, orgId, onSaved, trigger }: SubscriptionFormProps) {
  const t = useTranslations("settings");
  const isEditing = !!initial;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(initial?.events ?? []);
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const endpoint = isEditing ? `/api/webhooks/subscriptions/${initial.id}` : "/api/webhooks/subscriptions";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify(isEditing ? { url, events: selectedEvents, isActive } : { url, events: selectedEvents }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("saveError"));
        return;
      }
      const data = await res.json();
      if (!isEditing && data.secretOnCreate) {
        setCreatedSecret(data.secretOnCreate);
        return;
      }
      setOpen(false);
      onSaved();
    } catch {
      setError(t("networkSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedSecret(null);
    setError(null);
    if (!isEditing) { setUrl(""); setSelectedEvents([]); }
    if (createdSecret) onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        {createdSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("webhookCreated")}</DialogTitle>
              <DialogDescription>{t("webhookCreatedDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{t("signingSecret")}</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all">{createdSecret}</code>
                <CopyButton value={createdSecret} />
              </div>
              <p className="text-xs text-muted-foreground">{t("secretHint")}</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{t("done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEditing ? t("editWebhook") : t("newWebhookDialog")}</DialogTitle>
              <DialogDescription>{isEditing ? t("editWebhookDesc") : t("newWebhookDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="webhook-url">{t("receivingUrl")}</Label>
                <Input id="webhook-url" type="url" placeholder="https://hooks.zapier.com/hooks/catch/..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t("events")}</Label>
                <div className="space-y-4 rounded-md border border-border p-3 max-h-64 overflow-y-auto">
                  {EVENT_GROUP_KEYS.map((group) => (
                    <div key={group.labelKey}>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">{t(group.labelKey as any)}</p>
                      <div className="space-y-1.5">
                        {group.events.map((ev) => (
                          <div key={ev.id} className="flex items-center gap-2">
                            <Checkbox id={`ev-${ev.id}`} checked={selectedEvents.includes(ev.id)} onCheckedChange={() => toggleEvent(ev.id)} disabled={saving} />
                            <label htmlFor={`ev-${ev.id}`} className="text-sm cursor-pointer select-none">
                              {t(ev.labelKey as any)}
                              <span className="ml-1.5 text-xs text-muted-foreground font-mono">{ev.id}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Checkbox id="is-active" checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} disabled={saving} />
                  <label htmlFor="is-active" className="text-sm cursor-pointer select-none">{t("webhookActive")}</label>
                </div>
              )}
              {error && <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={saving}>{t("cancel")}</Button>
              <Button onClick={handleSave} disabled={saving || !url || selectedEvents.length === 0}>
                {saving ? t("savingEllipsis") : isEditing ? t("save") : t("create")}
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
  const t = useTranslations("settings");
  const { orgId } = useOrganization();
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "error">>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/webhooks/subscriptions", { headers: { "x-organization-id": orgId } });
      if (!res.ok) throw new Error(t("loadError"));
      const json = await res.json();
      setSubscriptions(json.data ?? []);
    } catch {
      setPageError(t("webhooksLoadError"));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/webhooks/subscriptions/${id}`, { method: "DELETE", headers: { "x-organization-id": orgId ?? "" } });
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch { await loadSubscriptions(); } finally { setDeletingId(null); }
  };

  const handleTest = async (id: string) => {
    if (!orgId) return;
    setTestingId(id);
    try {
      const res = await fetch(`/api/webhooks/subscriptions/${id}/test`, { method: "POST", headers: { "x-organization-id": orgId } });
      setTestResult((prev) => ({ ...prev, [id]: res.ok ? "ok" : "error" }));
      setTimeout(() => setTestResult((prev) => { const next = { ...prev }; delete next[id]; return next; }), 4000);
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: "error" }));
    } finally { setTestingId(null); }
  };

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("webhooksTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{t("webhooksDesc")}</p>
        </div>
        {orgId && (
          <SubscriptionFormDialog orgId={orgId} onSaved={loadSubscriptions} trigger={<Button size="sm">{t("newWebhook")}</Button>} />
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{t("signatureVerification")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("signatureDesc")}
        </p>
      </div>

      {loading && <div className="text-sm text-muted-foreground font-mono animate-pulse">{t("loadingWebhooks")}</div>}
      {pageError && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">{pageError}</div>}

      {!loading && subscriptions.length === 0 && !pageError && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium mb-1">{t("noWebhooksYet")}</p>
          <p className="text-xs text-muted-foreground font-mono mb-4">{t("noWebhooksHint")}</p>
          {orgId && (
            <SubscriptionFormDialog orgId={orgId} onSaved={loadSubscriptions} trigger={<Button variant="outline" size="sm">{t("createFirstWebhook")}</Button>} />
          )}
        </div>
      )}

      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <Card key={sub.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge sub={sub} />
                    <CardTitle className="text-sm font-mono truncate">{sub.url}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {t("lastTrigger", { date: formatDate(sub.lastTriggeredAt) })}
                    {sub.failCount > 0 && (
                      <span className="ml-3 text-orange-600">{t("errorCount", { count: sub.failCount })}</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" disabled={testingId === sub.id} onClick={() => handleTest(sub.id)}>
                    {testingId === sub.id ? t("sendingStatus") : testResult[sub.id] === "ok" ? t("sent") : testResult[sub.id] === "error" ? t("errorStatus") : t("sendTest")}
                  </Button>
                  {orgId && (
                    <SubscriptionFormDialog initial={sub} orgId={orgId} onSaved={loadSubscriptions} trigger={<Button variant="outline" size="sm" className="text-xs h-7 px-2">{t("edit")}</Button>} />
                  )}
                  <DeleteConfirmDialog loading={deletingId === sub.id} onConfirm={() => handleDelete(sub.id)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {sub.events.map((ev) => (
                  <span key={ev} className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{ev}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
