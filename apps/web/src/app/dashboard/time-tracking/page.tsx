"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  IconClock,
  IconPlayerPlay,
  IconPlayerStop,
  IconDownload,
  IconSearch,
  IconEdit,
  IconTrash,
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────────
interface TimeEntry {
  id: string
  userId: string
  userName: string | null
  commissionId: string | null
  commissionName: string | null
  projectId: string | null
  projectName: string | null
  description: string | null
  startTime: string
  endTime: string | null
  durationMinutes: number | null
  billable: boolean
  hourlyRate: number | null
  status: string
  createdAt: string
  updatedAt: string
}

interface Commission {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  const diff = (day === 0 ? -6 : 1) - day // Monday = start
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date): Date {
  const r = new Date(d)
  r.setDate(1)
  r.setHours(0, 0, 0, 0)
  return r
}

function getElapsedSeconds(startTime: string): number {
  return Math.max(0, (Date.now() - new Date(startTime).getTime()) / 1000)
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TimeTrackingPage() {
  // Data state
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [commissionsList, setCommissionsList] = useState<Commission[]>([])
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Timer tick
  const [tick, setTick] = useState(0)

  // Dialogs
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // Start timer form
  const [newCommissionId, setNewCommissionId] = useState<string>("none")
  const [newProjectId, setNewProjectId] = useState<string>("none")
  const [newDescription, setNewDescription] = useState("")
  const [newBillable, setNewBillable] = useState(true)
  const [newHourlyRate, setNewHourlyRate] = useState("")

  // Edit form
  const [editDescription, setEditDescription] = useState("")
  const [editBillable, setEditBillable] = useState(true)
  const [editHourlyRate, setEditHourlyRate] = useState("")
  const [editCommissionId, setEditCommissionId] = useState("none")
  const [editProjectId, setEditProjectId] = useState("none")
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCommission, setFilterCommission] = useState<string>("all")
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")

  // ── Running timer ──────────────────────────────────────────────────────────
  const runningEntry = useMemo(
    () => entries.find((e) => e.status === "running") ?? null,
    [entries]
  )

  // Tick every second when a timer is running
  useEffect(() => {
    if (!runningEntry) return
    const iv = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(iv)
  }, [runningEntry])

  const runningElapsedSec = useMemo(() => {
    if (!runningEntry) return 0
    // tick is dependency to force re-compute
    void tick
    return getElapsedSeconds(runningEntry.startTime)
  }, [runningEntry, tick])

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries")
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch (err) {
      console.error("Failed to fetch time entries:", err)
    }
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/commissions?limit=100"),
        fetch("/api/projects?limit=100"),
      ])
      if (cRes.ok) {
        const cData = await cRes.json()
        const items = cData.items ?? cData
        setCommissionsList(
          Array.isArray(items) ? items.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []
        )
      }
      if (pRes.ok) {
        const pData = await pRes.json()
        const items = pData.items ?? pData
        setProjectsList(
          Array.isArray(items) ? items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })) : []
        )
      }
    } catch (err) {
      console.error("Failed to fetch meta:", err)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchEntries(), fetchMeta()]).finally(() => setLoading(false))
  }, [fetchEntries, fetchMeta])

  // ── Start timer ────────────────────────────────────────────────────────────
  const handleStartTimer = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionId: newCommissionId === "none" ? null : newCommissionId,
          projectId: newProjectId === "none" ? null : newProjectId,
          description: newDescription.trim() || null,
          billable: newBillable,
          hourlyRate: newHourlyRate ? Math.round(parseFloat(newHourlyRate) * 100) : null,
        }),
      })

      if (res.ok) {
        setStartDialogOpen(false)
        resetStartForm()
        await fetchEntries()
      } else {
        const err = await res.json()
        alert(err.error || "Fehler beim Starten")
      }
    } catch {
      alert("Netzwerkfehler")
    } finally {
      setSaving(false)
    }
  }

  const resetStartForm = () => {
    setNewCommissionId("none")
    setNewProjectId("none")
    setNewDescription("")
    setNewBillable(true)
    setNewHourlyRate("")
  }

  // ── Stop timer ─────────────────────────────────────────────────────────────
  const handleStopTimer = async () => {
    if (!runningEntry) return
    setSaving(true)
    try {
      const res = await fetch(`/api/time-entries/${runningEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })
      if (res.ok) {
        await fetchEntries()
      }
    } catch {
      alert("Netzwerkfehler")
    } finally {
      setSaving(false)
    }
  }

  // ── Edit entry ─────────────────────────────────────────────────────────────
  const openEditDialog = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditDescription(entry.description || "")
    setEditBillable(entry.billable)
    setEditHourlyRate(entry.hourlyRate ? (entry.hourlyRate / 100).toFixed(2) : "")
    setEditCommissionId(entry.commissionId || "none")
    setEditProjectId(entry.projectId || "none")
    setEditStartTime(entry.startTime ? new Date(entry.startTime).toISOString().slice(0, 16) : "")
    setEditEndTime(entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : "")
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return
    setSaving(true)
    try {
      const res = await fetch(`/api/time-entries/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription.trim() || null,
          billable: editBillable,
          hourlyRate: editHourlyRate ? Math.round(parseFloat(editHourlyRate) * 100) : null,
          commissionId: editCommissionId === "none" ? null : editCommissionId,
          projectId: editProjectId === "none" ? null : editProjectId,
          startTime: editStartTime || undefined,
          endTime: editEndTime || undefined,
        }),
      })
      if (res.ok) {
        setEditDialogOpen(false)
        setEditingEntry(null)
        await fetchEntries()
      }
    } catch {
      alert("Netzwerkfehler")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete entry ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Zeiteintrag wirklich löschen?")) return
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" })
      if (res.ok) await fetchEntries()
    } catch {
      alert("Netzwerkfehler")
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = useMemo(() => new Date(), [])
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  const getEntryMinutes = useCallback(
    (e: TimeEntry): number => {
      if (e.status === "running") return runningElapsedSec / 60
      return e.durationMinutes ?? 0
    },
    [runningElapsedSec]
  )

  const todayHours = useMemo(() => {
    const mins = entries
      .filter((e) => new Date(e.startTime) >= todayStart)
      .reduce((sum, e) => sum + getEntryMinutes(e), 0)
    return mins / 60
  }, [entries, todayStart, getEntryMinutes])

  const weekHours = useMemo(() => {
    const mins = entries
      .filter((e) => new Date(e.startTime) >= weekStart)
      .reduce((sum, e) => sum + getEntryMinutes(e), 0)
    return mins / 60
  }, [entries, weekStart, getEntryMinutes])

  const monthBillable = useMemo(() => {
    return entries
      .filter((e) => e.billable && new Date(e.startTime) >= monthStart)
      .reduce((sum, e) => {
        const hours = getEntryMinutes(e) / 60
        const rate = (e.hourlyRate ?? 0) / 100
        return sum + hours * rate
      }, 0)
  }, [entries, monthStart, getEntryMinutes])

  // ── Weekly chart ───────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    const ws = startOfWeek(now)
    return labels.map((label, i) => {
      const dayStart = new Date(ws)
      dayStart.setDate(dayStart.getDate() + i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const hours = entries
        .filter((e) => {
          const st = new Date(e.startTime)
          return st >= dayStart && st < dayEnd
        })
        .reduce((sum, e) => sum + getEntryMinutes(e) / 60, 0)

      return { name: label, stunden: Math.round(hours * 100) / 100 }
    })
  }, [entries, now, getEntryMinutes])

  // ── Filtered entries ───────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match =
          (e.description?.toLowerCase().includes(q)) ||
          (e.userName?.toLowerCase().includes(q)) ||
          (e.commissionName?.toLowerCase().includes(q)) ||
          (e.projectName?.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterCommission !== "all" && e.commissionId !== filterCommission) return false
      if (filterProject !== "all" && e.projectId !== filterProject) return false
      if (filterFrom && new Date(e.startTime) < new Date(filterFrom)) return false
      if (filterTo) {
        const to = new Date(filterTo)
        to.setDate(to.getDate() + 1)
        if (new Date(e.startTime) >= to) return false
      }
      return true
    })
  }, [entries, searchQuery, filterCommission, filterProject, filterFrom, filterTo])

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const BOM = "\uFEFF"
    const header = "Datum;Mitarbeiter;Kommission;Projekt;Beschreibung;Start;Ende;Dauer (h);Abrechenbar;Stundensatz CHF"
    const rows = filteredEntries.map((e) => {
      const durationH = e.status === "running"
        ? (getElapsedSeconds(e.startTime) / 3600).toFixed(2)
        : ((e.durationMinutes ?? 0) / 60).toFixed(2)
      return [
        formatDate(e.startTime),
        e.userName || "",
        e.commissionName || "",
        e.projectName || "",
        (e.description || "").replace(/;/g, ","),
        formatTime(e.startTime),
        e.endTime ? formatTime(e.endTime) : "",
        durationH.replace(".", ","),
        e.billable ? "Ja" : "Nein",
        e.hourlyRate ? (e.hourlyRate / 100).toFixed(2).replace(".", ",") : "",
      ].join(";")
    })

    const csv = BOM + header + "\n" + rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zeiterfassung_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zeiterfassung</h1>
          <p className="text-muted-foreground text-sm">
            Arbeitszeiten erfassen, Timer starten und Auswertungen einsehen.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <IconDownload className="mr-2 h-4 w-4" />
          CSV Export
        </Button>
      </div>

      {/* ── Active Timer ────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
          {runningEntry ? (
            <>
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  Timer läuft
                  {runningEntry.commissionName && (
                    <span> &mdash; {runningEntry.commissionName}</span>
                  )}
                  {runningEntry.projectName && (
                    <span> / {runningEntry.projectName}</span>
                  )}
                </div>
                <div className="font-mono text-5xl font-bold tabular-nums tracking-tight">
                  {formatDuration(runningElapsedSec)}
                </div>
                {runningEntry.description && (
                  <p className="text-muted-foreground text-sm">
                    {runningEntry.description}
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                size="lg"
                onClick={handleStopTimer}
                disabled={saving}
              >
                {saving ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconPlayerStop className="mr-2 h-4 w-4" />
                )}
                Stoppen
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              <IconClock className="text-muted-foreground h-10 w-10" />
              <p className="text-muted-foreground text-sm">Kein Timer aktiv</p>
              <Button onClick={() => setStartDialogOpen(true)}>
                <IconPlayerPlay className="mr-2 h-4 w-4" />
                Timer starten
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Heute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayHours.toFixed(1)} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Diese Woche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekHours.toFixed(1)} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Abrechenbar (Monat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              CHF {monthBillable.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Weekly Bar Chart ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wochenübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} unit=" h" width={50} />
              <Tooltip
                formatter={(value) => [`${value} h`, "Stunden"]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="stunden" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Einträge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[200px] flex-1">
              <IconSearch className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-[160px]">
              <Select value={filterCommission} onValueChange={setFilterCommission}>
                <SelectTrigger>
                  <SelectValue placeholder="Kommission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kommissionen</SelectItem>
                  {commissionsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Projekte</SelectItem>
                  {projectsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-[150px]"
                placeholder="Von"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-[150px]"
                placeholder="Bis"
              />
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────────── */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Kommission / Projekt</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead className="text-right">Dauer</TableHead>
                  <TableHead>Abrechenbar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground h-24 text-center"
                    >
                      Keine Einträge gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => {
                    const durationMin =
                      entry.status === "running"
                        ? runningElapsedSec / 60
                        : (entry.durationMinutes ?? 0)

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(entry.startTime)}
                        </TableCell>
                        <TableCell>{entry.userName || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {entry.commissionName && (
                              <span className="text-sm">{entry.commissionName}</span>
                            )}
                            {entry.projectName && (
                              <span className="text-muted-foreground text-xs">
                                {entry.projectName}
                              </span>
                            )}
                            {!entry.commissionName && !entry.projectName && "—"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatHHMM(durationMin)}
                        </TableCell>
                        <TableCell>
                          {entry.billable ? (
                            <Badge variant="default">Ja</Badge>
                          ) : (
                            <Badge variant="secondary">Nein</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.status === "running"
                                ? "default"
                                : entry.status === "approved"
                                  ? "default"
                                  : "secondary"
                            }
                            className={
                              entry.status === "running"
                                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                : ""
                            }
                          >
                            {entry.status === "running"
                              ? "Läuft"
                              : entry.status === "stopped"
                                ? "Gestoppt"
                                : entry.status === "approved"
                                  ? "Genehmigt"
                                  : entry.status === "rejected"
                                    ? "Abgelehnt"
                                    : entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <IconEdit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                                <IconEdit className="mr-2 h-4 w-4" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(entry.id)}
                                className="text-destructive"
                              >
                                <IconTrash className="mr-2 h-4 w-4" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Start Timer Dialog ──────────────────────────────────────────── */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Timer starten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kommission</Label>
              <Select value={newCommissionId} onValueChange={setNewCommissionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Keine Kommission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Kommission</SelectItem>
                  {commissionsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projekt (optional)</Label>
              <Select value={newProjectId} onValueChange={setNewProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kein Projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projectsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Was wird gemacht?"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="billable-switch">Abrechenbar</Label>
              <Switch
                id="billable-switch"
                checked={newBillable}
                onCheckedChange={setNewBillable}
              />
            </div>

            <div className="space-y-2">
              <Label>Stundensatz (CHF)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                placeholder="z.B. 120.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStartDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleStartTimer} disabled={saving}>
              {saving ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconPlayerPlay className="mr-2 h-4 w-4" />
              )}
              Starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Entry Dialog ───────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eintrag bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kommission</Label>
              <Select value={editCommissionId} onValueChange={setEditCommissionId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Kommission</SelectItem>
                  {commissionsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projekt</Label>
              <Select value={editProjectId} onValueChange={setEditProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projectsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ende</Label>
                <Input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-billable-switch">Abrechenbar</Label>
              <Switch
                id="edit-billable-switch"
                checked={editBillable}
                onCheckedChange={setEditBillable}
              />
            </div>

            <div className="space-y-2">
              <Label>Stundensatz (CHF)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={editHourlyRate}
                onChange={(e) => setEditHourlyRate(e.target.value)}
                placeholder="z.B. 120.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
