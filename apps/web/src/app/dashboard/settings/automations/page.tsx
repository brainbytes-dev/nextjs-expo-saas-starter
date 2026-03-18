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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOrganization } from "@/hooks/use-organization";
import {
  TRIGGER_EVENT_LABELS,
  CONDITION_FIELD_LABELS,
  CONDITION_OPERATOR_LABELS,
  ACTION_TYPE_LABELS,
  RULE_TEMPLATES,
  type Condition,
  type Action,
  type TriggerEvent,
  type ConditionField,
  type ConditionOperator,
  type ActionType,
  type RuleTemplate,
} from "@/lib/rules-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowRule {
  id: string;
  name: string;
  triggerEvent: string;
  conditions: Condition[];
  actions: Action[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triggerBadgeColor(event: string): string {
  if (event.startsWith("stock.")) return "border-blue-500/30 text-blue-600 bg-blue-500/10";
  if (event.startsWith("tool.")) return "border-amber-500/30 text-amber-600 bg-amber-500/10";
  if (event.startsWith("maintenance.")) return "border-orange-500/30 text-orange-600 bg-orange-500/10";
  if (event.startsWith("commission.")) return "border-purple-500/30 text-purple-600 bg-purple-500/10";
  return "border-border text-muted-foreground";
}

function getEventLabel(event: string): string {
  return TRIGGER_EVENT_LABELS[event as TriggerEvent] ?? event;
}

function getActionLabel(type: string): string {
  return ACTION_TYPE_LABELS[type as ActionType] ?? type;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

// ─── Condition Row ────────────────────────────────────────────────────────────

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: Condition;
  index: number;
  onChange: (index: number, c: Condition) => void;
  onRemove: (index: number) => void;
}) {
  const fields = Object.keys(CONDITION_FIELD_LABELS) as ConditionField[];
  const operators = Object.keys(CONDITION_OPERATOR_LABELS) as ConditionOperator[];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={condition.field}
        onValueChange={(v) => onChange(index, { ...condition, field: v })}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Feld" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f} value={f} className="text-xs">
              {CONDITION_FIELD_LABELS[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(v) =>
          onChange(index, { ...condition, operator: v as ConditionOperator })
        }
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op} className="text-xs">
              {CONDITION_OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="h-8 w-36 text-xs"
        placeholder="Wert"
        value={String(condition.value)}
        onChange={(e) => {
          const raw = e.target.value;
          const asNum = Number(raw);
          const value = raw !== "" && !Number.isNaN(asNum) ? asNum : raw;
          onChange(index, { ...condition, value });
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
        onClick={() => onRemove(index)}
      >
        Entfernen
      </Button>
    </div>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────

const ACTION_CONFIG_FIELDS: Record<ActionType, { key: string; label: string; placeholder: string }[]> = {
  send_email: [
    { key: "to", label: "An (E-Mail)", placeholder: "lager@beispiel.ch" },
    { key: "subject", label: "Betreff", placeholder: "Benachrichtigung: {{materialName}}" },
    { key: "body", label: "Text", placeholder: "Hallo,\n\nBitte prüfen Sie..." },
  ],
  send_whatsapp: [
    { key: "to", label: "Telefonnummer", placeholder: "+41791234567" },
    { key: "message", label: "Nachricht", placeholder: "Warnung: {{materialName}} ..." },
  ],
  create_order: [
    { key: "supplierId", label: "Lieferant-ID", placeholder: "supplier-uuid" },
    { key: "quantity", label: "Bestellmenge", placeholder: "50" },
  ],
  create_task: [
    { key: "title", label: "Aufgabentitel", placeholder: "Werkzeug einfordern: {{toolName}}" },
    { key: "assigneeEmail", label: "Zugewiesen an (E-Mail)", placeholder: "chef@beispiel.ch" },
    { key: "priority", label: "Priorität (low/medium/high)", placeholder: "high" },
  ],
  block_checkout: [
    { key: "reason", label: "Sperrgrund", placeholder: "Wartung fällig — Ausbuchung gesperrt." },
  ],
  webhook: [
    { key: "url", label: "Webhook-URL", placeholder: "https://hooks.zapier.com/..." },
    { key: "secret", label: "Secret (optional)", placeholder: "mein-geheimer-key" },
  ],
};

function ActionRow({
  action,
  index,
  onChange,
  onRemove,
}: {
  action: Action;
  index: number;
  onChange: (index: number, a: Action) => void;
  onRemove: (index: number) => void;
}) {
  const actionTypes = Object.keys(ACTION_TYPE_LABELS) as ActionType[];
  const configFields = ACTION_CONFIG_FIELDS[action.type] ?? [];

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={action.type}
          onValueChange={(v) =>
            onChange(index, { type: v as ActionType, config: {} })
          }
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Aktion" />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {ACTION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs text-destructive hover:text-destructive ml-auto"
          onClick={() => onRemove(index)}
        >
          Entfernen
        </Button>
      </div>

      {configFields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {f.label}
          </Label>
          {f.key === "body" || f.key === "message" ? (
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs min-h-[72px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={f.placeholder}
              value={String(action.config[f.key] ?? "")}
              onChange={(e) =>
                onChange(index, {
                  ...action,
                  config: { ...action.config, [f.key]: e.target.value },
                })
              }
            />
          ) : (
            <Input
              className="h-8 text-xs"
              placeholder={f.placeholder}
              value={String(action.config[f.key] ?? "")}
              onChange={(e) =>
                onChange(index, {
                  ...action,
                  config: { ...action.config, [f.key]: e.target.value },
                })
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Rule Form Dialog ─────────────────────────────────────────────────────────

interface RuleFormDialogProps {
  orgId: string;
  initial?: WorkflowRule;
  trigger: React.ReactNode;
  onSaved: () => void;
}

function RuleFormDialog({ orgId, initial, trigger, onSaved }: RuleFormDialogProps) {
  const isEditing = !!initial;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [triggerEvent, setTriggerEvent] = useState<TriggerEvent>(
    (initial?.triggerEvent as TriggerEvent) ?? "stock.changed"
  );
  const [conditions, setConditions] = useState<Condition[]>(initial?.conditions ?? []);
  const [actions, setActions] = useState<Action[]>(
    initial?.actions ?? [{ type: "send_email", config: {} }]
  );
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerEvents = Object.keys(TRIGGER_EVENT_LABELS) as TriggerEvent[];

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const endpoint = isEditing
        ? `/api/workflow-rules/${initial.id}`
        : "/api/workflow-rules";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({ name, triggerEvent, conditions, actions, priority, isActive }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Fehler beim Speichern");
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
    setError(null);
    if (!isEditing) {
      setName("");
      setTriggerEvent("stock.changed");
      setConditions([]);
      setActions([{ type: "send_email", config: {} }]);
      setPriority(0);
      setIsActive(true);
    }
  };

  const addCondition = () =>
    setConditions((prev) => [
      ...prev,
      { field: "quantity", operator: "lt", value: 10 },
    ]);

  const updateCondition = (i: number, c: Condition) =>
    setConditions((prev) => prev.map((x, idx) => (idx === i ? c : x)));

  const removeCondition = (i: number) =>
    setConditions((prev) => prev.filter((_, idx) => idx !== i));

  const addAction = () =>
    setActions((prev) => [...prev, { type: "send_email", config: {} }]);

  const updateAction = (i: number, a: Action) =>
    setActions((prev) => prev.map((x, idx) => (idx === i ? a : x)));

  const removeAction = (i: number) =>
    setActions((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Regel bearbeiten" : "Neue Automatisierungsregel"}
          </DialogTitle>
          <DialogDescription>
            Definiere wann und was automatisch passieren soll. Verwende{" "}
            <code className="text-xs font-mono bg-muted px-1 rounded">{"{{feldname}}"}</code>{" "}
            für dynamische Werte im Text.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              placeholder="z.B. Meldebestand-Warnung"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Trigger Event */}
          <div className="space-y-1.5">
            <Label>Auslösendes Ereignis</Label>
            <Select
              value={triggerEvent}
              onValueChange={(v) => setTriggerEvent(v as TriggerEvent)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerEvents.map((ev) => (
                  <SelectItem key={ev} value={ev}>
                    <span className="text-sm">{TRIGGER_EVENT_LABELS[ev]}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">
                      {ev}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bedingungen</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addCondition}
                disabled={saving}
              >
                + Bedingung
              </Button>
            </div>
            {conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
                Keine Bedingungen — Regel feuert bei jedem Ereignis.
              </p>
            ) : (
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <ConditionRow
                    key={i}
                    condition={c}
                    index={i}
                    onChange={updateCondition}
                    onRemove={removeCondition}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Aktionen</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addAction}
                disabled={saving}
              >
                + Aktion
              </Button>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
                Mindestens eine Aktion hinzufügen.
              </p>
            ) : (
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <ActionRow
                    key={i}
                    action={a}
                    index={i}
                    onChange={updateAction}
                    onRemove={removeAction}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Priority + Active */}
          <div className="flex items-center gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="rule-priority">Priorität</Label>
              <Input
                id="rule-priority"
                type="number"
                className="h-8 w-24 text-sm"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                disabled={saving}
                min={0}
                max={1000}
              />
              <p className="text-[10px] text-muted-foreground">
                Höher = zuerst ausgeführt
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Switch
                id="rule-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={saving}
              />
              <Label htmlFor="rule-active" className="text-sm cursor-pointer">
                Regel aktiv
              </Label>
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
            onClick={handleSave}
            disabled={saving || !name.trim() || actions.length === 0}
          >
            {saving ? "Speichern..." : isEditing ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Activation Dialog ───────────────────────────────────────────────

function TemplateCard({
  template,
  orgId,
  onActivated,
}: {
  template: RuleTemplate;
  orgId: string;
  onActivated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const activate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          name: template.name,
          triggerEvent: template.triggerEvent,
          conditions: template.conditions,
          actions: template.actions,
          priority: template.priority,
          isActive: true,
        }),
      });
      if (res.ok) {
        setDone(true);
        onActivated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 ${triggerBadgeColor(template.triggerEvent)}`}
          >
            {getEventLabel(template.triggerEvent)}
          </Badge>
        </div>
        <CardTitle className="text-sm">{template.name}</CardTitle>
        <CardDescription className="text-xs">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <div className="flex flex-wrap gap-1 mb-3">
          {template.actions.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {getActionLabel(a.type)}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          variant={done ? "outline" : "default"}
          className="w-full text-xs h-8"
          onClick={activate}
          disabled={loading || done}
        >
          {done ? "Aktiviert" : loading ? "Aktivieren..." : "Vorlage aktivieren"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Test Dialog ──────────────────────────────────────────────────────────────

function TestDialog({
  rule,
  orgId,
}: {
  rule: WorkflowRule;
  orgId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    conditionsMatched: boolean;
    matchedConditions: Condition[];
    failedConditions: Condition[];
    actionsWouldFire: Action[];
    contextUsed: Record<string, unknown>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/workflow-rules/${rule.id}/test`, {
        method: "POST",
        headers: { "x-organization-id": orgId },
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Fehler beim Test");
        return;
      }
      setResult(data);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 px-2">
          Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regeltest: {rule.name}</DialogTitle>
          <DialogDescription>
            Simuliert die Regel mit Beispieldaten. Keine echten Aktionen werden
            ausgeführt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!result && !loading && (
            <p className="text-sm text-muted-foreground">
              Klicke auf Test starten, um die Bedingungen mit typischen Beispieldaten
              zu prüfen.
            </p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Führe Test aus...
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          {result && (
            <div className="space-y-4">
              {/* Overall result */}
              <div
                className={`rounded-md px-4 py-3 text-sm font-medium ${
                  result.conditionsMatched
                    ? "bg-green-500/10 text-green-700 border border-green-500/20"
                    : "bg-red-500/10 text-red-700 border border-red-500/20"
                }`}
              >
                {result.conditionsMatched
                  ? "Alle Bedingungen erfüllt — Aktionen würden feuern."
                  : "Bedingungen nicht erfüllt — keine Aktionen."}
              </div>

              {/* Matched conditions */}
              {result.matchedConditions.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                    Erfüllte Bedingungen
                  </p>
                  {result.matchedConditions.map((c, i) => (
                    <div key={i} className="text-xs text-green-700 font-mono mb-1">
                      {c.field} {c.operator} {String(c.value)}
                    </div>
                  ))}
                </div>
              )}

              {/* Failed conditions */}
              {result.failedConditions.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                    Nicht erfüllte Bedingungen
                  </p>
                  {result.failedConditions.map((c, i) => (
                    <div key={i} className="text-xs text-red-700 font-mono mb-1">
                      {c.field} {c.operator} {String(c.value)}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions that would fire */}
              {result.actionsWouldFire.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                    Aktionen die ausgelöst würden
                  </p>
                  {result.actionsWouldFire.map((a, i) => (
                    <div
                      key={i}
                      className="text-xs rounded-md border border-border px-3 py-2 mb-2"
                    >
                      <span className="font-medium">{getActionLabel(a.type)}</span>
                      {a.type === "send_email" && Boolean(a.config.to) && (
                        <span className="ml-2 text-muted-foreground">
                          an {String(a.config.to)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Context used */}
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                  Verwendeter Kontext
                </p>
                <pre className="text-[10px] font-mono bg-muted rounded-md p-3 overflow-x-auto max-h-32">
                  {JSON.stringify(result.contextUsed, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Schliessen
          </Button>
          <Button onClick={runTest} disabled={loading}>
            {loading ? "Läuft..." : "Test starten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteRuleDialog({
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
          <DialogTitle>Regel löschen?</DialogTitle>
          <DialogDescription>
            Diese Automatisierungsregel wird permanent gelöscht.
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
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { orgId } = useOrganization();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/workflow-rules", {
        headers: { "x-organization-id": orgId },
      });
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json = await res.json();
      setRules(json.data ?? []);
    } catch {
      setPageError("Automatisierungsregeln konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggle = async (rule: WorkflowRule) => {
    if (!orgId) return;
    setTogglingId(rule.id);
    try {
      await fetch(`/api/workflow-rules/${rule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, isActive: !rule.isActive } : r
        )
      );
    } catch {
      await loadRules();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!orgId) return;
    setDeletingId(id);
    try {
      await fetch(`/api/workflow-rules/${id}`, {
        method: "DELETE",
        headers: { "x-organization-id": orgId },
      });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      await loadRules();
    } finally {
      setDeletingId(null);
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
          <h1 className="text-2xl font-semibold tracking-tight">Automatisierungen</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Definiere Regeln, die automatisch E-Mails senden, Aufgaben erstellen oder
            Ausbuchungen sperren — ausgelöst durch Ereignisse in LogistikApp.
          </p>
        </div>
        {orgId && (
          <RuleFormDialog
            orgId={orgId}
            onSaved={loadRules}
            trigger={<Button size="sm">+ Neue Regel</Button>}
          />
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Vorlagen
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Starte mit einer vordefinierten Vorlage oder erstelle eine eigene Regel.
          Vorlagen können nach der Aktivierung angepasst werden.
        </p>
        {orgId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {RULE_TEMPLATES.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                orgId={orgId}
                onActivated={loadRules}
              />
            ))}
          </div>
        )}
      </div>

      {/* State feedback */}
      {loading && (
        <p className="text-sm text-muted-foreground font-mono animate-pulse">
          Lade Regeln...
        </p>
      )}

      {pageError && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">
          {pageError}
        </div>
      )}

      {/* Empty state */}
      {!loading && rules.length === 0 && !pageError && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium mb-1">Noch keine Regeln konfiguriert</p>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            Aktiviere eine Vorlage oder erstelle eine eigene Regel.
          </p>
          {orgId && (
            <RuleFormDialog
              orgId={orgId}
              onSaved={loadRules}
              trigger={
                <Button variant="outline" size="sm">
                  Erste Regel erstellen
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Rules list */}
      {rules.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Aktive Regeln ({rules.length})
          </p>
          {rules.map((rule) => (
            <Card key={rule.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 ${triggerBadgeColor(rule.triggerEvent)}`}
                      >
                        {getEventLabel(rule.triggerEvent)}
                      </Badge>
                      {rule.priority > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 text-muted-foreground"
                        >
                          Priorität {rule.priority}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm">{rule.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Zuletzt geändert: {formatDate(rule.updatedAt)}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Active toggle */}
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule)}
                      disabled={togglingId === rule.id}
                      aria-label={rule.isActive ? "Regel deaktivieren" : "Regel aktivieren"}
                    />

                    {/* Test button */}
                    {orgId && <TestDialog rule={rule} orgId={orgId} />}

                    {/* Edit button */}
                    {orgId && (
                      <RuleFormDialog
                        orgId={orgId}
                        initial={rule}
                        onSaved={loadRules}
                        trigger={
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                            Bearbeiten
                          </Button>
                        }
                      />
                    )}

                    {/* Delete button */}
                    <DeleteRuleDialog
                      loading={deletingId === rule.id}
                      onConfirm={() => handleDelete(rule.id)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Conditions summary */}
                {rule.conditions.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-2">
                      Wenn
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rule.conditions.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                        >
                          {c.field} {c.operator} {String(c.value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions summary */}
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-2">
                    Dann
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rule.actions.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {getActionLabel(a.type)}
                        {a.type === "send_email" && a.config.to
                          ? ` → ${String(a.config.to)}`
                          : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
