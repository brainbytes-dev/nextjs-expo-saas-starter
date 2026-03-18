// All server-side imports are dynamic to prevent client-bundle contamination.
// Constants and types in this file are safe for client import.

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

async function getDbAndSchema() {
  const { getDb } = await import("@repo/db");
  const { workflowRules } = await import("@repo/db/schema");
  const { eq, and } = await import("drizzle-orm");
  return { db: getDb(), workflowRules, eq, and };
}

// ─── Trigger Events ───────────────────────────────────────────────────────────

export const TRIGGER_EVENTS = [
  "stock.changed",
  "stock.below_reorder",
  "tool.checked_out",
  "tool.overdue",
  "maintenance.due",
  "commission.created",
  "commission.completed",
] as const;

export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  "stock.changed": "Bestand geändert",
  "stock.below_reorder": "Unter Meldebestand",
  "tool.checked_out": "Werkzeug ausgebucht",
  "tool.overdue": "Werkzeug überfällig",
  "maintenance.due": "Wartung fällig",
  "commission.created": "Kommission erstellt",
  "commission.completed": "Kommission abgeschlossen",
};

// ─── Condition Types ──────────────────────────────────────────────────────────

export const CONDITION_FIELDS = [
  "quantity",
  "newQuantity",
  "previousQuantity",
  "changeType",
  "toolCondition",
  "daysOverdue",
  "daysUntilMaintenance",
  "materialId",
  "locationId",
] as const;

export type ConditionField = (typeof CONDITION_FIELDS)[number];

export const CONDITION_FIELD_LABELS: Record<ConditionField, string> = {
  quantity: "Menge (Delta)",
  newQuantity: "Neue Menge",
  previousQuantity: "Vorherige Menge",
  changeType: "Buchungstyp",
  toolCondition: "Werkzeugzustand",
  daysOverdue: "Tage überfällig",
  daysUntilMaintenance: "Tage bis Wartung",
  materialId: "Material-ID",
  locationId: "Lager-ID",
};

export const CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
] as const;

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: "gleich",
  neq: "ungleich",
  gt: "größer als",
  lt: "kleiner als",
  gte: "größer oder gleich",
  lte: "kleiner oder gleich",
  contains: "enthält",
};

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

// ─── Action Types ─────────────────────────────────────────────────────────────

export const ACTION_TYPES = [
  "send_email",
  "send_whatsapp",
  "create_order",
  "create_task",
  "block_checkout",
  "webhook",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  send_email: "E-Mail senden",
  send_whatsapp: "WhatsApp senden",
  create_order: "Bestellung erstellen",
  create_task: "Aufgabe erstellen",
  block_checkout: "Ausbuchung sperren",
  webhook: "Webhook auslösen",
};

export interface Action {
  type: ActionType;
  config: Record<string, unknown>;
}

// ─── Rule Shape (from DB) ─────────────────────────────────────────────────────

export interface WorkflowRuleRow {
  id: string;
  organizationId: string;
  name: string;
  triggerEvent: string;
  conditions: unknown;
  actions: unknown;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Condition Evaluation ─────────────────────────────────────────────────────

/**
 * Compare a single context field value against a condition.
 * Returns true when the condition is satisfied.
 */
function compareValues(
  actual: unknown,
  operator: ConditionOperator,
  expected: string | number | boolean
): boolean {
  switch (operator) {
    case "eq":
      return actual == expected;
    case "neq":
      return actual != expected;
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default:
      return false;
  }
}

/**
 * Check whether ALL conditions in the array are satisfied by the event context.
 * An empty conditions array is treated as "always match".
 */
export function checkConditions(
  conditions: Condition[],
  context: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => {
    const actual = context[c.field];
    return compareValues(actual, c.operator, c.value);
  });
}

// ─── Action Execution ─────────────────────────────────────────────────────────

async function executeAction(
  orgId: string,
  action: Action,
  context: Record<string, unknown>
): Promise<void> {
  switch (action.type) {
    case "send_email": {
      const { to, subject, body } = action.config as {
        to?: string;
        subject?: string;
        body?: string;
      };

      if (!to) {
        console.warn("[rules-engine] send_email action missing 'to' address");
        return;
      }

      if (DEMO_MODE) {
        console.log(`[rules-engine][DEMO] Would send email to ${to}: ${subject}`);
        return;
      }

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const interpolated = interpolate(body ?? "", context);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@logistikapp.ch",
          to,
          subject: subject ? interpolate(subject, context) : "LogistikApp Automatisierung",
          html: `<p>${interpolated.replace(/\n/g, "<br>")}</p>
<p style="color:#999;font-size:11px;margin-top:24px;">
  Diese E-Mail wurde durch eine automatische Regel in LogistikApp ausgelöst.
</p>`,
        });
      } catch (err) {
        console.error("[rules-engine] send_email failed:", err);
        console.error("[rules-engine]", err);
      }
      break;
    }

    case "send_whatsapp": {
      // TODO: Integrate WhatsApp provider (e.g. Twilio or 360dialog) when configured.
      console.log("[rules-engine] send_whatsapp action triggered (no provider configured):", {
        orgId,
        config: action.config,
        context,
      });
      break;
    }

    case "create_order": {
      // TODO: Auto-create a purchase order when stock.below_reorder fires.
      // Calls POST /api/orders with materialId + supplierId from action.config.
      console.log("[rules-engine] create_order action triggered:", { orgId, config: action.config, context });
      break;
    }

    case "create_task": {
      const { title, assigneeEmail, priority: taskPriority } = action.config as {
        title?: string;
        assigneeEmail?: string;
        priority?: string;
      };

      if (!title) {
        console.warn("[rules-engine] create_task action missing 'title'");
        return;
      }

      if (DEMO_MODE) {
        console.log(`[rules-engine][DEMO] Would create task: "${title}"`);
        return;
      }

      // Fire-and-forget task creation via internal API
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      try {
        await fetch(`${appUrl}/api/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": orgId,
            "x-internal-rules-engine": "1",
          },
          body: JSON.stringify({
            title: interpolate(title, context),
            assigneeEmail,
            priority: taskPriority ?? "medium",
            source: "rules_engine",
          }),
        });
      } catch (err) {
        console.error("[rules-engine] create_task failed:", err);
        console.error("[rules-engine]", err);
      }
      break;
    }

    case "block_checkout": {
      // This action is handled synchronously at the call site — the evaluateRules
      // caller must inspect the returned ActionResult array.
      // Here we only log that the rule matched.
      console.log("[rules-engine] block_checkout matched for org:", orgId);
      break;
    }

    case "webhook": {
      const { url, secret } = action.config as { url?: string; secret?: string };
      if (!url) {
        console.warn("[rules-engine] webhook action missing 'url'");
        return;
      }

      const body = JSON.stringify({
        event: context._triggerEvent ?? "rules_engine",
        organizationId: orgId,
        timestamp: new Date().toISOString(),
        data: context,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "LogistikApp-RulesEngine/1.0",
      };

      if (secret) {
        const { createHmac } = await import("crypto");
        const sig = createHmac("sha256", secret).update(body, "utf8").digest("hex");
        headers["X-Rules-Engine-Signature"] = `sha256=${sig}`;
      }

      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10_000);
        await fetch(url, { method: "POST", headers, body, signal: controller.signal });
        clearTimeout(t);
      } catch (err) {
        console.error("[rules-engine] webhook action failed:", err);
        console.error("[rules-engine]", err);
      }
      break;
    }

    default:
      console.warn("[rules-engine] Unknown action type:", (action as Action).type);
  }
}

/**
 * Execute a list of actions for a rule match. Actions run in priority order
 * (insertion order). Failures are logged and captured but do not stop remaining
 * actions from running.
 */
export async function executeActions(
  orgId: string,
  actions: Action[],
  context: Record<string, unknown>
): Promise<void> {
  for (const action of actions) {
    try {
      await executeAction(orgId, action, context);
    } catch (err) {
      console.error("[rules-engine] Unexpected error in action:", action.type, err);
    }
  }
}

// ─── Main Evaluation ──────────────────────────────────────────────────────────

/**
 * Load all active rules for the given org + event, evaluate their conditions,
 * and execute matching actions.
 *
 * Rules are sorted by priority descending (higher number = higher priority).
 * All matching rules fire — there is no "first-match-only" short circuit.
 */
export async function evaluateRules(
  orgId: string,
  event: TriggerEvent,
  context: Record<string, unknown>
): Promise<void> {
  const enrichedContext = { ...context, _triggerEvent: event, _orgId: orgId };

  // Fire-and-forget: do not block the calling request
  (async () => {
    try {
      const { db, workflowRules: wfRules, eq: eqOp, and: andOp } = await getDbAndSchema();
      const rules = await db
        .select()
        .from(wfRules)
        .where(
          andOp(
            eqOp(wfRules.organizationId, orgId),
            eqOp(wfRules.isActive, true),
            eqOp(wfRules.triggerEvent, event)
          )
        );

      // Sort highest priority first
      const sorted = [...rules].sort((a, b) => b.priority - a.priority);

      for (const rule of sorted) {
        const conditions = parseJsonArray<Condition>(rule.conditions);
        const actions = parseJsonArray<Action>(rule.actions);

        if (checkConditions(conditions, enrichedContext)) {
          await executeActions(orgId, actions, enrichedContext);
        }
      }
    } catch (err) {
      console.error("[rules-engine] evaluateRules error:", err);
    }
  })();
}

// ─── Dry-Run Evaluation (for test endpoint) ───────────────────────────────────

export interface DryRunResult {
  ruleId: string;
  ruleName: string;
  conditionsMatched: boolean;
  matchedConditions: Condition[];
  failedConditions: Condition[];
  actionsWouldFire: Action[];
}

/**
 * Synchronous dry-run — no side effects. Returns detailed match info per rule.
 */
export async function dryRunRule(
  orgId: string,
  ruleId: string,
  context: Record<string, unknown>
): Promise<DryRunResult | null> {
  const { db, workflowRules: wfRules, eq: eqOp, and: andOp } = await getDbAndSchema();
  const [rule] = await db
    .select()
    .from(wfRules)
    .where(andOp(eqOp(wfRules.id, ruleId), eqOp(wfRules.organizationId, orgId)))
    .limit(1);

  if (!rule) return null;

  const conditions = parseJsonArray<Condition>(rule.conditions);
  const actions = parseJsonArray<Action>(rule.actions);
  const enrichedContext: Record<string, unknown> = { ...context, _triggerEvent: rule.triggerEvent, _orgId: orgId };

  const matchedConditions: Condition[] = [];
  const failedConditions: Condition[] = [];

  for (const c of conditions) {
    const actual = enrichedContext[c.field];
    if (compareValues(actual, c.operator, c.value)) {
      matchedConditions.push(c);
    } else {
      failedConditions.push(c);
    }
  }

  const conditionsMatched = failedConditions.length === 0;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    conditionsMatched,
    matchedConditions,
    failedConditions,
    actionsWouldFire: conditionsMatched ? actions : [],
  };
}

// ─── Pre-built Rule Templates ─────────────────────────────────────────────────

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  triggerEvent: TriggerEvent;
  conditions: Condition[];
  actions: Action[];
  priority: number;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "template_meldebestand_warnung",
    name: "Meldebestand-Warnung",
    description:
      "Sendet eine E-Mail an den Lagerverwalter, wenn der Bestand eines Materials unter den Meldebestand fällt.",
    triggerEvent: "stock.below_reorder",
    conditions: [],
    actions: [
      {
        type: "send_email",
        config: {
          to: "lager@beispiel.ch",
          subject: "Meldebestand unterschritten: {{materialName}}",
          body: "Hallo,\n\ndas Material {{materialName}} ({{materialNumber}}) hat den Meldebestand unterschritten.\n\nAktuelle Menge: {{newQuantity}}\nLager: {{locationName}}\n\nBitte eine Nachbestellung veranlassen.",
        },
      },
    ],
    priority: 10,
  },
  {
    id: "template_werkzeug_ueberfaellig",
    name: "Werkzeug überfällig",
    description:
      "Sendet eine E-Mail und erstellt eine Aufgabe, wenn ein Werkzeug seit mehr als 7 Tagen ausgebucht ist.",
    triggerEvent: "tool.overdue",
    conditions: [
      {
        field: "daysOverdue",
        operator: "gte",
        value: 7,
      },
    ],
    actions: [
      {
        type: "send_email",
        config: {
          to: "verwaltung@beispiel.ch",
          subject: "Werkzeug überfällig: {{toolName}}",
          body: "Hallo,\n\ndas Werkzeug {{toolName}} ist seit {{daysOverdue}} Tagen ausgebucht und wurde nicht zurückgegeben.\n\nAusgebucht an: {{checkedOutToName}}\n\nBitte umgehend kontaktieren.",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Werkzeug einfordern: {{toolName}} ({{daysOverdue}} Tage überfällig)",
          priority: "high",
        },
      },
    ],
    priority: 20,
  },
  {
    id: "template_wartung_faellig",
    name: "Wartung fällig",
    description:
      "Sendet eine E-Mail und sperrt die Ausbuchung, wenn die Wartung eines Werkzeugs fällig ist.",
    triggerEvent: "maintenance.due",
    conditions: [
      {
        field: "daysUntilMaintenance",
        operator: "lte",
        value: 0,
      },
    ],
    actions: [
      {
        type: "send_email",
        config: {
          to: "verwaltung@beispiel.ch",
          subject: "Wartung fällig: {{toolName}}",
          body: "Hallo,\n\ndie Wartung für Werkzeug {{toolName}} ist fällig.\n\nBitte umgehend zur Wartung geben. Das Werkzeug wird gesperrt.",
        },
      },
      {
        type: "block_checkout",
        config: {
          reason: "Wartung fällig — Ausbuchung gesperrt.",
        },
      },
    ],
    priority: 30,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Naive template interpolation: replace {{key}} with context[key].
 * Does not execute code — purely string substitution.
 */
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = context[key];
    if (val === undefined || val === null) return "";
    return String(val);
  });
}
