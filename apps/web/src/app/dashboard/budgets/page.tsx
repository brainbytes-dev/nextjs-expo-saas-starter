"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconPlus,
  IconWallet,
  IconChartBar,
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"

// ── Types ──────────────────────────────────────────────────────────────────────
interface Budget {
  id: string
  name: string
  amount: number // cents
  spent: number // cents
  period: string | null
  startDate: string | null
  endDate: string | null
  projectId: string | null
  projectName: string | null
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCHF(cents: number): string {
  return `CHF ${(cents / 100).toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getStatusColor(pct: number): {
  bar: string
  text: string
  badge: "default" | "secondary" | "destructive"
  label: string
  icon: React.ReactNode
} {
  if (pct > 90) {
    return {
      bar: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
      badge: "destructive",
      label: "Kritisch",
      icon: <IconAlertTriangle className="size-3" />,
    }
  }
  if (pct > 70) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      badge: "secondary",
      label: "Achtung",
      icon: <IconInfoCircle className="size-3" />,
    }
  }
  return {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "default",
    label: "Im Budget",
    icon: <IconCheck className="size-3" />,
  }
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: "Monatlich",
  quarterly: "Quartalsweise",
  yearly: "Jährlich",
  project: "Projektbezogen",
}

// ── Create Budget Dialog ───────────────────────────────────────────────────────
interface CreateBudgetDialogProps {
  onCreated: (budget: Budget) => void
}

function CreateBudgetDialog({ onCreated }: CreateBudgetDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    amountChf: "",
    period: "",
    startDate: "",
    endDate: "",
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(parseFloat(form.amountChf) * 100)
    if (!form.name.trim() || isNaN(amountCents) || amountCents <= 0) return

    setLoading(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount: amountCents,
          period: form.period || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        }),
      })
      if (!res.ok) throw new Error("Fehler beim Erstellen")
      const created = await res.json() as Budget
      onCreated(created)
      setOpen(false)
      setForm({ name: "", amountChf: "", period: "", startDate: "", endDate: "" })
    } catch {
      // keep form open — user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <IconPlus className="size-4" />
          Budget erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Neues Budget erstellen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="budget-name">Name</Label>
              <Input
                id="budget-name"
                placeholder="z.B. Q1 2026 Elektro"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget-amount">Betrag (CHF)</Label>
              <Input
                id="budget-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="5000.00"
                value={form.amountChf}
                onChange={(e) => update("amountChf", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget-period">Periode</Label>
              <Select value={form.period} onValueChange={(v) => update("period", v)}>
                <SelectTrigger id="budget-period">
                  <SelectValue placeholder="Periode wählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                  <SelectItem value="quarterly">Quartalsweise</SelectItem>
                  <SelectItem value="yearly">Jährlich</SelectItem>
                  <SelectItem value="project">Projektbezogen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="budget-start">Startdatum</Label>
                <Input
                  id="budget-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="budget-end">Enddatum</Label>
                <Input
                  id="budget-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.name.trim() || !form.amountChf}
            >
              {loading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Budget Card ────────────────────────────────────────────────────────────────
function BudgetCard({ budget }: { budget: Budget }) {
  const pct = budget.amount > 0
    ? Math.min(Math.round((budget.spent / budget.amount) * 100), 100)
    : 0
  const status = getStatusColor(pct)
  const remaining = budget.amount - budget.spent

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconWallet className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold">
                {budget.name}
              </CardTitle>
              {budget.projectName && (
                <CardDescription className="truncate text-xs">
                  {budget.projectName}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {budget.period && (
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {PERIOD_LABELS[budget.period] ?? budget.period}
              </Badge>
            )}
            <Badge
              variant={status.badge}
              className="flex items-center gap-1 text-xs"
            >
              {status.icon}
              {pct}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Verbraucht</span>
            <span>Budget</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${status.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-medium">
            <span className={status.text}>{formatCHF(budget.spent)}</span>
            <span className="text-muted-foreground">{formatCHF(budget.amount)}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-2.5 text-xs">
          <div>
            <p className="text-muted-foreground">Verbleibend</p>
            <p className={`font-semibold ${remaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
              {formatCHF(Math.abs(remaining))}
              {remaining < 0 && " überschritten"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Zeitraum</p>
            <p className="font-medium text-foreground">
              {budget.startDate
                ? `${formatDate(budget.startDate)} – ${formatDate(budget.endDate)}`
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Summary Stats ──────────────────────────────────────────────────────────────
function SummaryStats({ budgets }: { budgets: Budget[] }) {
  const total = budgets.reduce((s, b) => s + b.amount, 0)
  const spent = budgets.reduce((s, b) => s + b.spent, 0)
  const over = budgets.filter((b) => b.spent > b.amount).length
  const critical = budgets.filter(
    (b) => b.amount > 0 && b.spent / b.amount > 0.9
  ).length

  const stats = [
    {
      label: "Gesamtbudget",
      value: formatCHF(total),
      sub: `${budgets.length} Budgets`,
    },
    {
      label: "Gesamt verbraucht",
      value: formatCHF(spent),
      sub:
        total > 0
          ? `${Math.round((spent / total) * 100)}% des Gesamtbudgets`
          : "—",
    },
    {
      label: "Kritisch (>90%)",
      value: String(critical),
      sub: over > 0 ? `${over} überschritten` : "Keine überschritten",
    },
    {
      label: "Verbleibend",
      value: formatCHF(Math.max(0, total - spent)),
      sub: total > 0 ? `${Math.round(Math.max(0, (total - spent) / total) * 100)}% verfügbar` : "—",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BudgetsPage() {
  const [budgetList, setBudgetList] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/budgets")
      if (res.ok) {
        const data = await res.json() as Budget[]
        setBudgetList(data)
      }
    } catch {
      // fail silently — empty state shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchBudgets()
  }, [fetchBudgets])

  function handleCreated(budget: Budget) {
    setBudgetList((prev) => [budget, ...prev])
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Budgetübersicht und Kostenkontrolle für Projekte und Zeiträume.
          </p>
        </div>
        <CreateBudgetDialog onCreated={handleCreated} />
      </div>

      {/* Summary stats */}
      {!loading && budgetList.length > 0 && (
        <SummaryStats budgets={budgetList} />
      )}

      {/* Budget grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-2.5 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : budgetList.length === 0 ? (
        <Empty className="py-20">
          <EmptyMedia>
            <IconChartBar className="size-12 text-muted-foreground/40" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Noch keine Budgets</EmptyTitle>
            <EmptyDescription>
              Erstellen Sie Ihr erstes Budget, um Ausgaben zu verfolgen und
              Kostenkontrolle zu betreiben.
            </EmptyDescription>
          </EmptyHeader>
          <CreateBudgetDialog onCreated={handleCreated} />
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgetList.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </div>
      )}
    </div>
  )
}
