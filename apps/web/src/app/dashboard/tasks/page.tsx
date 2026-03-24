"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
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
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
type LinkedType = "tool" | "material" | "key" | null

interface Task {
  id: string
  title: string
  status: string | null
  topic: string | null
  description: string | null
  dueDate: string | null
  assignedToId: string | null
  assignedToName: string | null
  materialId: string | null
  toolId: string | null
  createdAt: string
  updatedAt: string
}

const ALL_STATUSES: TaskStatus[] = ["open", "inProgress", "done", "cancelled"]

const STATUS_ICONS: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  open: IconCircle,
  inProgress: IconClock,
  done: IconCircleCheck,
  cancelled: IconCircleX,
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: "text-muted-foreground bg-muted",
  inProgress: "text-primary bg-primary/10",
  done: "text-secondary bg-secondary/10",
  cancelled: "text-muted-foreground bg-muted",
}

const LINKED_TYPE_ICONS: Record<NonNullable<LinkedType>, React.ComponentType<{ className?: string }>> = {
  tool: IconTool,
  material: IconPackage,
  key: IconKey,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function isOverdue(dueDate: string | null, status: string | null) {
  if (!dueDate || status === "done" || status === "cancelled") return false
  return new Date(dueDate) < new Date()
}

function getLinkedType(task: Task): LinkedType {
  if (task.toolId) return "tool"
  if (task.materialId) return "material"
  return null
}

function normalizeStatus(status: string | null): TaskStatus {
  if (!status) return "open"
  // Map DB values to frontend values
  const map: Record<string, TaskStatus> = {
    open: "open",
    in_progress: "inProgress",
    inProgress: "inProgress",
    completed: "done",
    done: "done",
    cancelled: "cancelled",
  }
  return map[status] ?? "open"
}

function statusToDb(status: TaskStatus): string {
  // Map frontend values to DB values
  const map: Record<TaskStatus, string> = {
    open: "open",
    inProgress: "inProgress",
    done: "done",
    cancelled: "cancelled",
  }
  return map[status]
}

// ── Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const t = useTranslations("tasks")
  const tc = useTranslations("common")

  const [tasks, setTasks] = useState<Task[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newTopic, setNewTopic] = useState("maintenance")

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tasks")
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error("Failed to load tasks:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingId(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusToDb(newStatus) }),
      })
      if (!res.ok) throw new Error("Failed to update status")

      // Optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: statusToDb(newStatus), updatedAt: new Date().toISOString() } : task
        )
      )
    } catch (err) {
      console.error("Failed to update task status:", err)
      // Refetch on error
      fetchTasks()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete task")
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
    } catch (err) {
      console.error("Failed to delete task:", err)
    }
  }

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const nStatus = normalizeStatus(task.status)
      const matchSearch =
        !search ||
        (task.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (task.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (task.assignedToName ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || nStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, tasks])

  const counts = useMemo(
    () => ({
      open: tasks.filter((t) => normalizeStatus(t.status) === "open").length,
      inProgress: tasks.filter((t) => normalizeStatus(t.status) === "inProgress").length,
      done: tasks.filter((t) => normalizeStatus(t.status) === "done").length,
      cancelled: tasks.filter((t) => normalizeStatus(t.status) === "cancelled").length,
      overdue: tasks.filter((t) => isOverdue(t.dueDate, normalizeStatus(t.status))).length,
    }),
    [tasks]
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.open} {t("openCount")} · {counts.inProgress} {t("inProgressCount")}
            {counts.overdue > 0 && ` · `}
            {counts.overdue > 0 && (
              <span className="text-destructive font-medium">{counts.overdue} {t("overdueCount")}</span>
            )}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          {t("addTask")}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {ALL_STATUSES.map((s) => {
          const StatusIcon = STATUS_ICONS[s]
          const color = STATUS_COLORS[s]
          const count = counts[s]
          return (
            <Card
              key={s}
              className={`border-0 cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <span className={`inline-flex items-center justify-center size-9 rounded-lg ${color}`}>
                  <StatusIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{t(`statuses.${s}`)}</p>
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
            placeholder={tc("search") + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
                <EmptyTitle>{t("noTasksFound")}</EmptyTitle>
                <EmptyDescription>
                  {search ? t("adjustSearch") : t("createFirst")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("status")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("details")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("topic")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("responsible")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">{t("dueDate")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const nStatus = normalizeStatus(task.status)
                  const StatusIcon = STATUS_ICONS[nStatus]
                  const statusColor = STATUS_COLORS[nStatus]
                  const overdue = isOverdue(task.dueDate, nStatus)
                  const linkedType = getLinkedType(task)
                  const LinkedIcon = linkedType ? LINKED_TYPE_ICONS[linkedType] : null
                  const isUpdating = updatingId === task.id

                  return (
                    <TableRow
                      key={task.id}
                      className={`group hover:bg-muted/80 border-b border-border ${nStatus === "done" || nStatus === "cancelled" ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${statusColor}`}>
                          {isUpdating ? (
                            <IconLoader2 className="size-3 animate-spin" />
                          ) : (
                            <StatusIcon className="size-3" />
                          )}
                          {t(`statuses.${nStatus}`)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground line-clamp-1">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 flex items-center gap-1">
                            {LinkedIcon && <LinkedIcon className="size-3" />}
                            {task.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.topic ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {t(`topics.${task.topic}`, { defaultValue: task.topic })}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {task.assignedToName ?? "-"}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={`text-sm font-medium ${overdue ? "text-destructive" : "text-foreground"}`}>
                            {overdue && <IconAlertCircle className="inline size-3.5 mr-0.5" />}
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
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
                            {/* Status change submenu */}
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-2">
                                <StatusIcon className="size-4" />
                                {t("status")}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {ALL_STATUSES.map((s) => {
                                  const SIcon = STATUS_ICONS[s]
                                  const isActive = nStatus === s
                                  return (
                                    <DropdownMenuItem
                                      key={s}
                                      className={`gap-2 ${isActive ? "font-semibold" : ""}`}
                                      disabled={isActive}
                                      onClick={() => handleStatusChange(task.id, s)}
                                    >
                                      <SIcon className="size-4" />
                                      {t(`statuses.${s}`)}
                                      {isActive && <IconCircleCheck className="size-3 ml-auto" />}
                                    </DropdownMenuItem>
                                  )
                                })}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2">
                              <IconEye className="size-4" /> {tc("details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <IconEdit className="size-4" /> {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => handleDelete(task.id)}
                            >
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
      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addTask")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newTitle.trim()) return
              setCreateLoading(true)
              try {
                const res = await fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDescription.trim() || undefined,
                    topic: newTopic,
                    status: "open",
                  }),
                })
                if (!res.ok) throw new Error("Failed")
                toast.success(t("taskCreated"))
                setCreateOpen(false)
                setNewTitle("")
                setNewDescription("")
                setNewTopic("maintenance")
                void fetchTasks()
              } catch {
                toast.error(t("taskCreateError"))
              } finally {
                setCreateLoading(false)
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t("titleLabel")}</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("titlePlaceholder")} required />
            </div>
            <div className="space-y-2">
              <Label>{t("descriptionLabel")}</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t("topicLabel")}</Label>
              <Select value={newTopic} onValueChange={setNewTopic}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">{t("topics.maintenance")}</SelectItem>
                  <SelectItem value="repair">{t("topics.repair")}</SelectItem>
                  <SelectItem value="inspection">{t("topics.inspection")}</SelectItem>
                  <SelectItem value="procurement">{t("topics.procurement")}</SelectItem>
                  <SelectItem value="other">{t("topics.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createLoading || !newTitle.trim()}>
                {createLoading ? t("creating") : t("addTask")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
