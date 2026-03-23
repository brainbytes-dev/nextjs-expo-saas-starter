"use client"

import { useState, useRef, useCallback, useTransition } from "react"
import { useTranslations } from "next-intl"
import {
  IconLayoutKanban,
  IconPlus,
  IconX,
  IconAlertCircle,
  IconUser,
  IconCalendar,
  IconClipboardList,
  IconChecklist,
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
type CardStatus = "open" | "inProgress" | "done"
type CardType = "task" | "commission"
type Priority = "urgent" | "high" | "normal" | "low"

interface KanbanCard {
  id: string
  type: CardType
  title: string
  assignee: string | null
  dueDate: string | null
  priority: Priority
  status: CardStatus
}

// ── Mock data ─────────────────────────────────────────────────────────
const INITIAL_CARDS: KanbanCard[] = [
  {
    id: "t1",
    type: "task",
    title: "Hilti TE 70-ATC — Jährliche Wartung",
    assignee: "Thomas Müller",
    dueDate: "2025-03-25",
    priority: "high",
    status: "open",
  },
  {
    id: "t2",
    type: "task",
    title: "Kabelrohr 20mm nachbestellen",
    assignee: "Peter Keller",
    dueDate: "2025-03-30",
    priority: "normal",
    status: "open",
  },
  {
    id: "t3",
    type: "task",
    title: "Schlüsselverwaltung digitalisieren",
    assignee: "Anna Weber",
    dueDate: "2025-04-01",
    priority: "normal",
    status: "open",
  },
  {
    id: "t4",
    type: "task",
    title: "Bosch GBH 5-40 DE — Getriebeschaden Reparatur",
    assignee: "Anna Weber",
    dueDate: "2025-03-20",
    priority: "urgent",
    status: "inProgress",
  },
  {
    id: "t5",
    type: "task",
    title: "Kompressor Atlas Copco GA15 — Ölwechsel",
    assignee: "Thomas Müller",
    dueDate: "2025-03-22",
    priority: "high",
    status: "inProgress",
  },
  {
    id: "c1",
    type: "commission",
    title: "K-2025-001 Elektroinstallation Oerlikon Phase 1",
    assignee: "Thomas Müller",
    dueDate: null,
    priority: "high",
    status: "inProgress",
  },
  {
    id: "c2",
    type: "commission",
    title: "K-2025-002 Reparatur Schulhaus Winterthur",
    assignee: "Anna Weber",
    dueDate: null,
    priority: "normal",
    status: "open",
  },
  {
    id: "t6",
    type: "task",
    title: "Sicherheitsventil SV-44 — Halbjahreskontrolle",
    assignee: "Sandra Huber",
    dueDate: "2025-03-15",
    priority: "low",
    status: "done",
  },
  {
    id: "c3",
    type: "commission",
    title: "K-2025-003 Wartung Industrieanlage Schlieren",
    assignee: "Peter Keller",
    dueDate: null,
    priority: "normal",
    status: "done",
  },
]

// ── Config ─────────────────────────────────────────────────────────────
const COLUMN_IDS: CardStatus[] = ["open", "inProgress", "done"]

const PRIORITY_STRIPE: Record<Priority, string> = {
  urgent: "bg-destructive",
  high: "bg-orange-500",
  normal: "bg-primary",
  low: "bg-muted-foreground/40",
}

const PRIORITY_KEYS: Priority[] = ["urgent", "high", "normal", "low"]

const COLUMN_BG: Record<CardStatus, string> = {
  open: "bg-muted/30",
  inProgress: "bg-primary/5",
  done: "bg-secondary/5",
}

const COLUMN_HEADER_COLOR: Record<CardStatus, string> = {
  open: "text-muted-foreground",
  inProgress: "text-primary",
  done: "text-secondary",
}

// ── Helpers ─────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  })
}

function isOverdue(dueDate: string | null, status: CardStatus) {
  if (!dueDate || status === "done") return false
  return new Date(dueDate) < new Date()
}

// ── Card Component ──────────────────────────────────────────────────────
function KanbanCardItem({
  card,
  onDragStart,
  t,
}: {
  card: KanbanCard
  onDragStart: (e: React.DragEvent, cardId: string) => void
  t: (key: string) => string
}) {
  const overdue = isOverdue(card.dueDate, card.status)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-sm",
        "cursor-grab active:cursor-grabbing active:opacity-60 active:shadow-lg",
        "hover:border-primary/40 hover:shadow-md transition-all duration-150",
        card.status === "done" && "opacity-70"
      )}
    >
      {/* Priority stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
          PRIORITY_STRIPE[card.priority]
        )}
      />

      {/* Type badge */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-medium px-1.5 py-0 leading-5 shrink-0",
            card.type === "commission"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          {card.type === "commission" ? (
            <>
              <IconClipboardList className="size-2.5 mr-0.5 inline" />
              {t("commission")}
            </>
          ) : (
            <>
              <IconChecklist className="size-2.5 mr-0.5 inline" />
              {t("task")}
            </>
          )}
        </Badge>
        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide shrink-0">
          {t(`priority.${card.priority}`)}
        </span>
      </div>

      {/* Title */}
      <p className="pl-2 text-sm font-medium text-foreground leading-snug line-clamp-2">
        {card.title}
      </p>

      {/* Meta row */}
      <div className="pl-2 flex items-center gap-3 flex-wrap">
        {card.assignee && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconUser className="size-3 shrink-0" />
            {card.assignee}
          </span>
        )}
        {card.dueDate && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              overdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {overdue && (
              <IconAlertCircle className="size-3 shrink-0" />
            )}
            {!overdue && <IconCalendar className="size-3 shrink-0" />}
            {formatDate(card.dueDate)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Column Component ────────────────────────────────────────────────────
function KanbanColumn({
  column,
  cards,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  isDragOver,
  showAddForm,
  onToggleAddForm,
  onAddCard,
  t,
}: {
  column: { id: CardStatus; label: string }
  cards: KanbanCard[]
  onDragStart: (e: React.DragEvent, cardId: string) => void
  onDragOver: (e: React.DragEvent, colId: CardStatus) => void
  onDrop: (e: React.DragEvent, colId: CardStatus) => void
  onDragLeave: () => void
  isDragOver: boolean
  showAddForm: boolean
  onToggleAddForm: () => void
  onAddCard: (title: string) => void
  t: (key: string) => string
}) {
  const [newTitle, setNewTitle] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onAddCard(trimmed)
    setNewTitle("")
  }

  return (
    <div className="flex flex-col gap-2 min-w-0 w-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              COLUMN_HEADER_COLOR[column.id]
            )}
          >
            {column.label}
          </span>
          <span className="flex items-center justify-center size-5 rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {cards.length}
          </span>
        </div>
        {column.id === "open" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={onToggleAddForm}
            aria-label={t("addTask")}
          >
            {showAddForm ? (
              <IconX className="size-3.5" />
            ) : (
              <IconPlus className="size-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => onDragOver(e, column.id)}
        onDrop={(e) => onDrop(e, column.id)}
        onDragLeave={onDragLeave}
        className={cn(
          "flex flex-col gap-2 rounded-xl p-2 min-h-[400px] transition-colors duration-150",
          COLUMN_BG[column.id],
          isDragOver && "ring-2 ring-primary ring-inset bg-primary/10"
        )}
      >
        {/* Inline add form (only on "open" column) */}
        {showAddForm && column.id === "open" && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-background p-2"
          >
            <Input
              autoFocus
              placeholder={t("taskTitlePlaceholder")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 p-0"
            />
            <div className="flex gap-1.5">
              <Button type="submit" size="sm" className="h-7 px-3 text-xs">
                {t("add")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setNewTitle("")
                  onToggleAddForm()
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}

        {cards.map((card) => (
          <KanbanCardItem
            key={card.id}
            card={card}
            onDragStart={onDragStart}
            t={t}
          />
        ))}

        {/* Empty state */}
        {cards.length === 0 && !showAddForm && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-muted-foreground/50 text-center">
              {t("noCards")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const t = useTranslations("kanbanBoard")
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS)
  const [filter, setFilter] = useState<"all" | "task" | "commission">("all")
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const dragCardId = useRef<string | null>(null)
  const [, startTransition] = useTransition()

  // ── Filtering ────────────────────────────────────────────────────────
  const filteredCards = cards.filter(
    (c) => filter === "all" || c.type === filter
  )

  function cardsForColumn(colId: CardStatus) {
    return filteredCards.filter((c) => c.status === colId)
  }

  // ── Drag handlers ─────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, cardId: string) {
    dragCardId.current = cardId
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, colId: CardStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(colId)
  }

  function handleDragLeave() {
    setDragOverCol(null)
  }

  function handleDrop(e: React.DragEvent, colId: CardStatus) {
    e.preventDefault()
    setDragOverCol(null)
    const cardId = dragCardId.current
    if (!cardId) return
    dragCardId.current = null

    const card = cards.find((c) => c.id === cardId)
    if (!card || card.status === colId) return

    // Optimistic update
    startTransition(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: colId } : c))
      )
    })

    // Fire-and-forget PATCH — in production this would call /api/tasks or /api/commissions
    fetch(`/api/${card.type === "commission" ? "commissions" : "tasks"}/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colId }),
    }).catch(() => {
      // Revert on failure
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: card.status } : c))
      )
    })
  }

  // ── Add card ──────────────────────────────────────────────────────────
  const handleAddCard = useCallback(
    (title: string) => {
      const newCard: KanbanCard = {
        id: `t-new-${Date.now()}`,
        type: "task",
        title,
        assignee: null,
        dueDate: null,
        priority: "normal",
        status: "open",
      }
      setCards((prev) => [newCard, ...prev])
      setShowAddForm(false)
    },
    []
  )

  const totalByStatus = {
    open: cards.filter((c) => c.status === "open").length,
    inProgress: cards.filter((c) => c.status === "inProgress").length,
    done: cards.filter((c) => c.status === "done").length,
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <IconLayoutKanban className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Kanban
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalByStatus.open} {t("column.open")} &middot;{" "}
            {totalByStatus.inProgress} {t("column.inProgress")} &middot;{" "}
            {totalByStatus.done} {t("column.done")}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
          >
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="task">{t("filterTasks")}</SelectItem>
              <SelectItem value="commission">{t("filterCommissions")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {COLUMN_IDS.map((colId) => (
          <KanbanColumn
            key={colId}
            column={{ id: colId, label: t(`column.${colId}`) }}
            cards={cardsForColumn(colId)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            isDragOver={dragOverCol === colId}
            showAddForm={showAddForm && colId === "open"}
            onToggleAddForm={() => setShowAddForm((v) => !v)}
            onAddCard={handleAddCard}
            t={t}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground font-medium">{t("priorityLabel")}:</p>
        {PRIORITY_KEYS.map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2.5 rounded-sm flex-shrink-0", PRIORITY_STRIPE[p])} />
            {t(`priority.${p}`)}
          </span>
        ))}
        <span className="ml-4 text-xs text-muted-foreground/50">
          {t("dragHint")}
        </span>
      </div>
    </div>
  )
}
