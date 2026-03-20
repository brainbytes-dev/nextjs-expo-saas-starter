"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  IconClipboardList,
  IconGripVertical,
  IconMapPin,
  IconUser,
  IconFilter,
  IconTable,
  IconLayoutKanban,
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────
type CommissionStatus = "open" | "in_progress" | "ready" | "completed"

interface Commission {
  id: string
  name: string
  number: number
  manualNumber: string | null
  status: string
  targetLocationName: string | null
  customerName: string | null
  responsibleName: string | null
  responsibleId: string | null
  customerId: string | null
  entryCount: number
  createdAt: string
}

// ── Column definitions ────────────────────────────────────────────────
const COLUMNS: { id: CommissionStatus; label: string; color: string }[] = [
  { id: "open", label: "Offen", color: "bg-muted/60" },
  { id: "in_progress", label: "In Bearbeitung", color: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "ready", label: "Bereit", color: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "completed", label: "Abgeschlossen", color: "bg-green-50 dark:bg-green-950/30" },
]

function ProgressBar({ total, done }: { total: number; done: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        {done}/{total}
      </span>
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────────
function KanbanCard({
  commission,
  onDragStart,
}: {
  commission: Commission
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const entryCount = Number(commission.entryCount ?? 0)
  // Rough progress: completed commissions = 100%, open = 0%, others = 50%
  const done =
    commission.status === "completed"
      ? entryCount
      : commission.status === "ready"
        ? Math.round(entryCount * 0.8)
        : commission.status === "in_progress"
          ? Math.round(entryCount * 0.4)
          : 0

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, commission.id)}
      className="group bg-background rounded-lg border border-border p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <IconGripVertical className="size-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Number + name */}
          <div>
            <p className="text-[11px] font-mono text-muted-foreground">
              K-{String(commission.number).padStart(3, "0")}
              {commission.manualNumber && (
                <span className="ml-1.5 text-muted-foreground/60">({commission.manualNumber})</span>
              )}
            </p>
            <Link
              href={`/dashboard/commissions/${commission.id}`}
              className="text-sm font-medium text-foreground leading-snug hover:text-primary transition-colors line-clamp-2"
            >
              {commission.name}
            </Link>
          </div>

          {/* Customer */}
          {commission.customerName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconUser className="size-3 shrink-0" />
              <span className="truncate">{commission.customerName}</span>
            </div>
          )}

          {/* Location */}
          {commission.targetLocationName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconMapPin className="size-3 shrink-0" />
              <span className="truncate">{commission.targetLocationName}</span>
            </div>
          )}

          {/* Entry count + progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {entryCount} {entryCount === 1 ? "Eintrag" : "Einträge"}
              </span>
            </div>
            {entryCount > 0 && <ProgressBar total={entryCount} done={done} />}
          </div>

          {/* Responsible */}
          {commission.responsibleName && (
            <div className="flex items-center gap-1 pt-0.5">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {commission.responsibleName.charAt(0)}
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                {commission.responsibleName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  column,
  commissions,
  onDragStart,
  onDrop,
  dragOverColumn,
  setDragOverColumn,
}: {
  column: (typeof COLUMNS)[number]
  commissions: Commission[]
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (status: CommissionStatus) => void
  dragOverColumn: CommissionStatus | null
  setDragOverColumn: (v: CommissionStatus | null) => void
}) {
  const isOver = dragOverColumn === column.id

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] w-[300px] rounded-xl transition-colors",
        column.color,
        isOver && "ring-2 ring-primary/40"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOverColumn(column.id)
      }}
      onDragLeave={() => setDragOverColumn(null)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOverColumn(null)
        onDrop(column.id)
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {commissions.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[200px]">
        {commissions.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/60 border border-dashed border-border/40 rounded-lg">
            Keine Kommissionen
          </div>
        )}
        {commissions.map((c) => (
          <KanbanCard key={c.id} commission={c} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function CommissionsKanbanPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [responsibleFilter, setResponsibleFilter] = useState("all")
  const [dragOverColumn, setDragOverColumn] = useState<CommissionStatus | null>(null)
  const draggedIdRef = useRef<string | null>(null)

  // ── Fetch commissions ──────────────────────────────────────────────
  const fetchCommissions = useCallback(async () => {
    try {
      const res = await fetch("/api/commissions?limit=200")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCommissions(data.data ?? [])
    } catch {
      // Silently fail — user sees empty board
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  // ── Drag & drop ────────────────────────────────────────────────────
  function handleDragStart(_e: React.DragEvent, id: string) {
    draggedIdRef.current = id
  }

  async function handleDrop(newStatus: CommissionStatus) {
    const id = draggedIdRef.current
    if (!id) return
    draggedIdRef.current = null

    const commission = commissions.find((c) => c.id === id)
    if (!commission || commission.status === newStatus) return

    // Optimistic update
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    )

    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setCommissions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: commission.status } : c))
      )
    }
  }

  // ── Filters ────────────────────────────────────────────────────────
  const filtered = commissions.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      String(c.number).includes(search) ||
      (c.customerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.responsibleName ?? "").toLowerCase().includes(search.toLowerCase())
    const matchCustomer = customerFilter === "all" || c.customerId === customerFilter
    const matchResponsible = responsibleFilter === "all" || c.responsibleId === responsibleFilter
    return matchSearch && matchCustomer && matchResponsible
  })

  // Extract unique customers + responsibles for filters
  const customers = Array.from(
    new Map(
      commissions
        .filter((c) => c.customerId && c.customerName)
        .map((c) => [c.customerId!, { id: c.customerId!, name: c.customerName! }])
    ).values()
  )

  const responsibles = Array.from(
    new Map(
      commissions
        .filter((c) => c.responsibleId && c.responsibleName)
        .map((c) => [c.responsibleId!, { id: c.responsibleId!, name: c.responsibleName! }])
    ).values()
  )

  // ── Group by status ────────────────────────────────────────────────
  function getColumnCommissions(status: CommissionStatus) {
    return filtered.filter((c) => c.status === status)
  }

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <IconLayoutKanban className="size-6" />
            Kommissionen Kanban
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {commissions.length} Kommissionen · Drag & Drop zum Status ändern
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard/commissions">
              <IconTable className="size-4" />
              Tabellenansicht
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative min-w-[200px]">
          <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Kunde" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kunden</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Verantwortlich" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Mitarbeiter</SelectItem>
            {responsibles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : commissions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <IconClipboardList className="size-16 text-muted-foreground/30" />
          <p className="text-sm">Noch keine Kommissionen vorhanden.</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/commissions">Zur Tabellenansicht</Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-h-0 h-full pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                commissions={getColumnCommissions(col.id)}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                dragOverColumn={dragOverColumn}
                setDragOverColumn={setDragOverColumn}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
