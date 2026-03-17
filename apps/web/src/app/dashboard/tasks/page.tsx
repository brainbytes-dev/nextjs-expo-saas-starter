"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconPlus,
  IconSearch,
  IconChecklist,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconTool,
  IconPackage,
  IconKey,
  IconAlertCircle,
  IconCircleCheck,
  IconCircle,
  IconCircleX,
  IconClock,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ──────────────────────────────────────────────────────────────
type TaskStatus = "open" | "inProgress" | "done" | "cancelled"
type TaskPriority = "low" | "medium" | "high"
type TaskTopic = "maintenance" | "repair" | "inspection" | "procurement" | "other"
type LinkedType = "tool" | "material" | "key" | null

interface Task {
  id: string
  status: TaskStatus
  priority: TaskPriority
  topic: TaskTopic
  itemName: string | null
  linkedType: LinkedType
  details: string
  responsible: string
  dueDate: string | null
  createdAt: string
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_TASKS: Task[] = [
  {
    id: "1",
    status: "open",
    priority: "high",
    topic: "maintenance",
    itemName: "Hilti TE 70-ATC",
    linkedType: "tool",
    details: "Jährliche Wartung fällig. Kohlebürsten prüfen.",
    responsible: "Thomas Müller",
    dueDate: "2025-03-25",
    createdAt: "2025-03-10",
  },
  {
    id: "2",
    status: "inProgress",
    priority: "high",
    topic: "repair",
    itemName: "Bosch GBH 5-40 DE",
    linkedType: "tool",
    details: "Getriebeschaden. An Werkstatt eingeschickt.",
    responsible: "Anna Weber",
    dueDate: "2025-03-20",
    createdAt: "2025-03-08",
  },
  {
    id: "3",
    status: "open",
    priority: "medium",
    topic: "procurement",
    itemName: "Kabelrohr 20mm",
    linkedType: "material",
    details: "Nachbestellung nötig — Bestand unter Meldebestand.",
    responsible: "Peter Keller",
    dueDate: "2025-03-30",
    createdAt: "2025-03-12",
  },
  {
    id: "4",
    status: "done",
    priority: "low",
    topic: "inspection",
    itemName: "Sicherheitsventil SV-44",
    linkedType: "material",
    details: "Halbjahreskontrolle abgeschlossen. Protokoll abgelegt.",
    responsible: "Sandra Huber",
    dueDate: "2025-03-15",
    createdAt: "2025-02-28",
  },
  {
    id: "5",
    status: "open",
    priority: "medium",
    topic: "other",
    itemName: null,
    linkedType: null,
    details: "Schlüsselverwaltung digitalisieren — Prozess dokumentieren.",
    responsible: "Anna Weber",
    dueDate: "2025-04-01",
    createdAt: "2025-03-14",
  },
  {
    id: "6",
    status: "inProgress",
    priority: "high",
    topic: "maintenance",
    itemName: "Kompressor Atlas Copco GA15",
    linkedType: "tool",
    details: "Ölwechsel und Filterreinigung. Termin mit Servicetechniker vereinbart.",
    responsible: "Thomas Müller",
    dueDate: "2025-03-22",
    createdAt: "2025-03-11",
  },
  {
    id: "7",
    status: "cancelled",
    priority: "low",
    topic: "repair",
    itemName: "Winkelschleifer Makita GA9020",
    linkedType: "tool",
    details: "Reparatur nicht wirtschaftlich. Gerät ausgemustert.",
    responsible: "Peter Keller",
    dueDate: null,
    createdAt: "2025-03-05",
  },
]

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  open: { label: "Offen", icon: IconCircle, color: "text-muted-foreground bg-muted" },
  inProgress: { label: "In Bearbeitung", icon: IconClock, color: "text-primary bg-primary/10" },
  done: { label: "Erledigt", icon: IconCircleCheck, color: "text-secondary bg-secondary/10" },
  cancelled: { label: "Abgebrochen", icon: IconCircleX, color: "text-muted-foreground bg-muted" },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Niedrig", color: "text-muted-foreground" },
  medium: { label: "Mittel", color: "text-primary" },
  high: { label: "Hoch", color: "text-destructive" },
}

const LINKED_TYPE_ICONS: Record<NonNullable<LinkedType>, React.ComponentType<{ className?: string }>> = {
  tool: IconTool,
  material: IconPackage,
  key: IconKey,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function isOverdue(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === "done" || status === "cancelled") return false
  return new Date(dueDate) < new Date()
}

// ── Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [loading] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_TASKS.filter((task) => {
      const matchSearch =
        !search ||
        task.details.toLowerCase().includes(search.toLowerCase()) ||
        (task.itemName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        task.responsible.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || task.status === statusFilter
      const matchPriority = priorityFilter === "all" || task.priority === priorityFilter
      return matchSearch && matchStatus && matchPriority
    })
  }, [search, statusFilter, priorityFilter])

  const counts = useMemo(() => ({
    open: MOCK_TASKS.filter((t) => t.status === "open").length,
    inProgress: MOCK_TASKS.filter((t) => t.status === "inProgress").length,
    overdue: MOCK_TASKS.filter((t) => isOverdue(t.dueDate, t.status)).length,
  }), [])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.open} offen · {counts.inProgress} in Bearbeitung
            {counts.overdue > 0 && ` · `}
            {counts.overdue > 0 && (
              <span className="text-destructive font-medium">{counts.overdue} überfällig</span>
            )}
          </p>
        </div>
        <Button className="gap-2">
          <IconPlus className="size-4" />
          {t("addTask")}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {(["open", "inProgress", "done", "cancelled"] as TaskStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s]
          const StatusIcon = cfg.icon
          const count = MOCK_TASKS.filter((t) => t.status === s).length
          return (
            <Card
              key={s}
              className={`border-0 cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <span className={`inline-flex items-center justify-center size-9 rounded-lg ${cfg.color}`}>
                  <StatusIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-2xl font-bold text-foreground leading-tight">{count}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={tc("search") + "…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priorität" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Prioritäten</SelectItem>
            <SelectItem value="high">{t("priorities.high")}</SelectItem>
            <SelectItem value="medium">{t("priorities.medium")}</SelectItem>
            <SelectItem value="low">{t("priorities.low")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconChecklist className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Keine Aufgaben gefunden</EmptyTitle>
                <EmptyDescription>
                  {search ? "Passen Sie Ihre Suche an." : "Erstellen Sie Ihre erste Aufgabe."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("status")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">{t("priority")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("details")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("topic")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("responsible")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">{t("dueDate")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const statusCfg = STATUS_CONFIG[task.status]
                  const StatusIcon = statusCfg.icon
                  const priorityCfg = PRIORITY_CONFIG[task.priority]
                  const overdue = isOverdue(task.dueDate, task.status)
                  const LinkedIcon = task.linkedType ? LINKED_TYPE_ICONS[task.linkedType] : null

                  return (
                    <TableRow
                      key={task.id}
                      className={`group hover:bg-muted/80 border-b border-border ${task.status === "done" || task.status === "cancelled" ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${statusCfg.color}`}>
                          <StatusIcon className="size-3" />
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold ${priorityCfg.color}`}>
                          {task.priority === "high" && <IconAlertCircle className="inline size-3.5 mr-0.5" />}
                          {priorityCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground line-clamp-1">{task.details}</p>
                        {task.itemName && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            {LinkedIcon && <LinkedIcon className="size-3" />}
                            {task.itemName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {t(`topics.${task.topic}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{task.responsible}</TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={`text-sm font-medium ${overdue ? "text-destructive" : "text-foreground"}`}>
                            {overdue && <IconAlertCircle className="inline size-3.5 mr-0.5" />}
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <IconEye className="size-4" /> Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <IconEdit className="size-4" /> {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                              <IconTrash className="size-4" /> {tc("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
