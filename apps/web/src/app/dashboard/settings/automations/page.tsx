"use client"

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
// Types only — no runtime imports from rules-engine to avoid server-only DB deps
type TriggerEvent = string;
type ConditionField = string;
type ConditionOperator = string;
type ActionType = string;
interface Condition { field: string; operator: string; value: string | number | boolean; }
interface Action { type: string; config: Record<string, unknown>; }
interface RuleTemplate { id: string; name: string; description: string; triggerEvent: string; conditions: Condition[]; actions: Action[]; priority: number; }

const TRIGGER_EVENTS = [
  "stock.changed", "stock.below_reorder",
  "tool.checked_out", "tool.overdue",
  "maintenance.due", "commission.created",
  "commission.completed",
] as const;

const CONDITION_FIELDS = [
  "quantity", "newQuantity", "previousQuantity",
  "changeType", "toolCondition", "daysOverdue",
  "daysUntilMaintenance", "materialId", "locationId",
] as const;

const CONDITION_OPERATORS = [
  "eq", "neq", "gt", "lt", "gte", "lte", "contains",
] as const;

const ACTION_TYPES = [
  "send_email", "send_whatsapp", "create_order",
  "create_task", "block_checkout", "webhook",
] as const;

const RULE_TEMPLATES: RuleTemplate[] = [
  { id: "tpl_meldebestand", name: "Meldebestand-Warnung", description: "E-Mail wenn Bestand unter Meldebestand fällt.", triggerEvent: "stock.below_reorder", conditions: [], actions: [{ type: "send_email", config: { to: "lager@beispiel.ch", subject: "Meldebestand: {{materialName}}", body: "Material {{materialName}} unter Meldebestand." } }], priority: 10 },
  { id: "tpl_werkzeug_ueberfaellig", name: "Werkzeug überfällig", description: "E-Mail wenn Werkzeug >7 Tage ausgebucht.", triggerEvent: "tool.overdue", conditions: [{ field: "daysOverdue", operator: "gte", value: 7 }], actions: [{ type: "send_email", config: { to: "verwaltung@beispiel.ch", subject: "Überfällig: {{toolName}}", body: "Werkzeug {{toolName}} seit {{daysOverdue}} Tagen ausgebucht." } }], priority: 20 },
  { id: "tpl_wartung_faellig", name: "Wartung fällig", description: "E-Mail + Ausbuchung sperren bei fälliger Wartung.", triggerEvent: "maintenance.due", conditions: [{ field: "daysUntilMaintenance", operator: "lte", value: 0 }], actions: [{ type: "send_email", config: { to: "technik@beispiel.ch", subject: "Wartung fällig: {{toolName}}", body: "Wartung für {{toolName}} ist fällig." } }, { type: "block_checkout", config: {} }], priority: 30 },
];

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

const TRIGGER_KEY_MAP: Record<string, string> = {
  "stock.changed": "triggerStockChanged",
  "stock.below_reorder": "triggerStockBelowReorder",
  "tool.checked_out": "triggerToolCheckedOut",
  "tool.overdue": "triggerToolOverdue",
  "maintenance.due": "triggerMaintenanceDue",
  "commission.created": "triggerCommissionCreated",
  "commission.completed": "triggerCommissionCompleted",
};

const CONDITION_FIELD_KEY_MAP: Record<string, string> = {
  quantity: "fieldQuantity", newQuantity: "fieldNewQuantity", previousQuantity: "fieldPreviousQuantity",
  changeType: "fieldChangeType", toolCondition: "fieldToolCondition", daysOverdue: "fieldDaysOverdue",
  daysUntilMaintenance: "fieldDaysUntilMaintenance", materialId: "fieldMaterialId", locationId: "fieldLocationId",
};

const OPERATOR_KEY_MAP: Record<string, string> = {
  eq: "opEq", neq: "opNeq", gt: "opGt", lt: "opLt",
  gte: "opGte", lte: "opLte", contains: "opContains",
};

const ACTION_KEY_MAP: Record<string, string> = {
  send_email: "actionSendEmail", send_whatsapp: "actionSendWhatsapp",
  create_order: "actionCreateOrder", create_task: "actionCreateTask",
  block_checkout: "actionBlockCheckout", webhook: "actionWebhook",
};

const ACTION_CONFIG_FIELD_KEYS: Record<string, { key: string; labelKey: string; placeholder: string }[]> = {
  send_email: [
    { key: "to", labelKey: "cfgEmailTo", placeholder: "lager@beispiel.ch" },
    { key: "subject", labelKey: "cfgEmailSubject", placeholder: "Benachrichtigung: {{materialName}}" },
    { key: "body", labelKey: "cfgEmailBody", placeholder: "Hallo,\n\nBitte prüfen Sie..." },
  ],
  send_whatsapp: [
    { key: "to", labelKey: "cfgWhatsappTo", placeholder: "+41791234567" },
    { key: "message", labelKey: "cfgWhatsappMessage", placeholder: "Warnung: {{materialName}} ..." },
  ],
  create_order: [
    { key: "supplierId", labelKey: "cfgSupplierId", placeholder: "supplier-uuid" },
    { key: "quantity", labelKey: "cfgOrderQuantity", placeholder: "50" },
  ],
  create_task: [
    { key: "title", labelKey: "cfgTaskTitle", placeholder: "Werkzeug einfordern: {{toolName}}" },
    { key: "assigneeEmail", labelKey: "cfgTaskAssignee", placeholder: "chef@beispiel.ch" },
    { key: "priority", labelKey: "cfgTaskPriority", placeholder: "high" },
  ],
  block_checkout: [
    { key: "reason", labelKey: "cfgBlockReason", placeholder: "Wartung fällig — Ausbuchung gesperrt." },
  ],
  webhook: [
    { key: "url", labelKey: "cfgWebhookUrl", placeholder: "https://hooks.zapier.com/..." },
    { key: "secret", labelKey: "cfgWebhookSecret", placeholder: "mein-geheimer-key" },
  ],
};

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
  const t = useTranslations("settings");
  const fields = CONDITION_FIELDS as unknown as ConditionField[];
  const operators = CONDITION_OPERATORS as unknown as ConditionOperator[];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={condition.field}
        onValueChange={(v) => onChange(index, { ...condition, field: v })}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder={t("fieldPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f} value={f} className="text-xs">
              {t(CONDITION_FIELD_KEY_MAP[f] as any)}
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
          <SelectValue placeholder={t("operatorPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op} className="text-xs">
              {t(OPERATOR_KEY_MAP[op] as any)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="h-8 w-36 text-xs"
        placeholder={t("valuePlaceholder")}
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
        {t("remove")}
      </Button>
    </div>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────

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
  const t = useTranslations("settings");
  const actionTypes = ACTION_TYPES as unknown as ActionType[];
  const configFields = ACTION_CONFIG_FIELD_KEYS[action.type] ?? [];

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
            <SelectValue placeholder={t("actionPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((at) => (
              <SelectItem key={at} value={at} className="text-xs">
                {t(ACTION_KEY_MAP[at] as any)}
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
          {t("remove")}
        </Button>
      </div>

      {configFields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {t(f.labelKey as any)}
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
  const t = useTranslations("settings");
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

  const triggerEvents = TRIGGER_EVENTS as unknown as TriggerEvent[];

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
        setError((data as { error?: string }).error ?? t("saveError"));
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
            {isEditing ? t("editRule") : t("newAutomationRule")}
          </DialogTitle>
          <DialogDescription>
            {t("ruleFormDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">{t("ruleName")}</Label>
            <Input
              id="rule-name"
              placeholder={t("ruleNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Trigger Event */}
          <div className="space-y-1.5">
            <Label>{t("triggerEvent")}</Label>
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
                    <span className="text-sm">{t(TRIGGER_KEY_MAP[ev] as any)}</span>
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
              <Label>{t("conditions")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addCondition}
                disabled={saving}
              >
                {t("addCondition")}
              </Button>
            </div>
            {conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
                {t("noConditions")}
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
              <Label>{t("actions")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addAction}
                disabled={saving}
              >
                {t("addAction")}
              </Button>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
                {t("noActions")}
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
              <Label htmlFor="rule-priority">{t("priorityLabel")}</Label>
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
                {t("priorityHint")}
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
                {t("ruleActive")}
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
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || actions.length === 0}
          >
            {saving ? t("savingEllipsis") : isEditing ? t("save") : t("create")}
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
  const t = useTranslations("settings");
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
            {t(TRIGGER_KEY_MAP[template.triggerEvent] as any)}
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
              {t(ACTION_KEY_MAP[a.type] as any)}
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
          {done ? t("activated") : loading ? t("activating") : t("activateTemplate")}
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
  const t = useTranslations("settings");
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
        setError((data as { error?: string }).error ?? t("testError"));
        return;
      }
      setResult(data);
    } catch {
      setError(t("networkError"));
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
          <DialogTitle>{t("ruleTestTitle", { name: rule.name })}</DialogTitle>
          <DialogDescription>
            {t("ruleTestDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!result && !loading && (
            <p className="text-sm text-muted-foreground">
              {t("ruleTestPrompt")}
            </p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {t("runningTest")}
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
                  ? t("conditionsMatched")
                  : t("conditionsNotMatched")}
              </div>

              {/* Matched conditions */}
              {result.matchedConditions.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                    {t("matchedConditions")}
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
                    {t("failedConditions")}
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
                    {t("actionsWouldFire")}
                  </p>
                  {result.actionsWouldFire.map((a, i) => (
                    <div
                      key={i}
                      className="text-xs rounded-md border border-border px-3 py-2 mb-2"
                    >
                      <span className="font-medium">{t(ACTION_KEY_MAP[a.type] as any)}</span>
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
                  {t("contextUsed")}
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
            {t("close")}
          </Button>
          <Button onClick={runTest} disabled={loading}>
            {loading ? t("running") : t("startTest")}
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
  const t = useTranslations("settings");
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
          {loading ? "..." : t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deleteRuleTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteRuleDesc")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            disabled={loading}
          >
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const ts = useTranslations("settings");
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
      if (!res.ok) throw new Error(ts("loadError"));
      const json = await res.json();
      setRules(json.data ?? []);
    } catch {
      setPageError(ts("rulesLoadError"));
    } finally {
      setLoading(false);
    }
  }, [orgId, ts]);

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
            {ts("title")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{ts("automationsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {ts("automationsDesc")}
          </p>
        </div>
        {orgId && (
          <RuleFormDialog
            orgId={orgId}
            onSaved={loadRules}
            trigger={<Button size="sm">{ts("newRule")}</Button>}
          />
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          {ts("templates")}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {ts("templatesDesc")}
        </p>
        {orgId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {RULE_TEMPLATES.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
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
          {ts("loadingRules")}
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
          <p className="text-sm font-medium mb-1">{ts("noRulesYet")}</p>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            {ts("noRulesHint")}
          </p>
          {orgId && (
            <RuleFormDialog
              orgId={orgId}
              onSaved={loadRules}
              trigger={
                <Button variant="outline" size="sm">
                  {ts("createFirstRule")}
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
            {ts("activeRules", { count: rules.length })}
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
                        {ts(TRIGGER_KEY_MAP[rule.triggerEvent] as any)}
                      </Badge>
                      {rule.priority > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 text-muted-foreground"
                        >
                          {ts("priorityNum", { num: rule.priority })}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm">{rule.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {ts("lastModified", { date: formatDate(rule.updatedAt) })}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Active toggle */}
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule)}
                      disabled={togglingId === rule.id}
                      aria-label={rule.isActive ? ts("deactivateRule") : ts("activateRule")}
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
                            {ts("edit")}
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
                      {ts("when")}
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
                    {ts("then")}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rule.actions.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                      >
                        {ts(ACTION_KEY_MAP[a.type] as any)}
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
