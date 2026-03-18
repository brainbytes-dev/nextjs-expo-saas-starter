"use client"

import { useState, useEffect, useCallback } from "react"
import { useOrganization } from "@/hooks/use-organization"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IconPlus,
  IconTrash,
  IconMail,
  IconCalendar,
  IconFileText,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ScheduledReport {
  id: string
  reportType: string
  schedule: string
  recipients: string[]
  format: string
  isActive: boolean
  lastSentAt: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------
const REPORT_TYPE_LABELS: Record<string, string> = {
  inventory: "Inventarbericht",
  tools: "Werkzeugbericht",
  movements: "Bewegungsbericht",
  commissions: "Kommissionsbericht",
}

const SCHEDULE_LABELS: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
}

const FORMAT_LABELS: Record<string, string> = {
  csv: "CSV",
  pdf: "PDF",
}

function formatDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ScheduledReportsPage() {
  const { orgId } = useOrganization()
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form state
  const [form, setForm] = useState({
    reportType: "inventory",
    schedule: "weekly",
    format: "csv",
    recipientsInput: "",
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const headers = orgId ? { "x-organization-id": orgId } : undefined

  const loadReports = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch("/api/scheduled-reports", { headers })
      if (res.ok) {
        const data = await res.json()
        setReports(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleToggle = async (id: string, isActive: boolean) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive } : r))
    )
    await fetch("/api/scheduled-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id, isActive }),
    })
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/scheduled-reports?id=${id}`, {
        method: "DELETE",
        headers,
      })
      setReports((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const handleCreate = async () => {
    setCreateError(null)
    const recipients = form.recipientsInput
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"))

    if (recipients.length === 0) {
      setCreateError("Mindestens eine gültige E-Mail-Adresse erforderlich.")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/scheduled-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          reportType: form.reportType,
          schedule: form.schedule,
          format: form.format,
          recipients,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Fehler beim Erstellen")
      }
      const created = await res.json()
      setReports((prev) => [...prev, created])
      setCreateOpen(false)
      setForm({
        reportType: "inventory",
        schedule: "weekly",
        format: "csv",
        recipientsInput: "",
      })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Geplante Berichte
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Berichte werden automatisch per E-Mail als CSV verschickt.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          Neuer Bericht
        </Button>
      </div>

      {/* Reports list */}
      <Card>
        {loading ? (
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        ) : reports.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <IconFileText className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Noch keine geplanten Berichte
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <IconPlus className="size-4" />
              Ersten Bericht erstellen
            </Button>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Berichtstyp</TableHead>
                <TableHead>Zeitplan</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Empfänger</TableHead>
                <TableHead>Zuletzt gesendet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <IconCalendar className="size-3.5 text-muted-foreground" />
                      {SCHEDULE_LABELS[report.schedule] ?? report.schedule}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {FORMAT_LABELS[report.format] ?? report.format}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <IconMail className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate max-w-[160px]">
                        {report.recipients.join(", ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(report.lastSentAt)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={report.isActive}
                      onCheckedChange={(v) => handleToggle(report.id, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={deleting === report.id}
                      onClick={() => handleDelete(report.id)}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen geplanten Bericht erstellen</DialogTitle>
            <DialogDescription>
              Der Bericht wird automatisch per E-Mail verschickt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Report type */}
            <div className="space-y-2">
              <Label>Berichtstyp</Label>
              <Select
                value={form.reportType}
                onValueChange={(v) => setForm((f) => ({ ...f, reportType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventarbericht</SelectItem>
                  <SelectItem value="tools">Werkzeugbericht</SelectItem>
                  <SelectItem value="movements">Bewegungsbericht</SelectItem>
                  <SelectItem value="commissions">Kommissionsbericht</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Zeitplan</Label>
              <Select
                value={form.schedule}
                onValueChange={(v) => setForm((f) => ({ ...f, schedule: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Täglich</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={form.format}
                onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Empfänger (E-Mail-Adressen)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                placeholder="max@mustermann.ch&#10;anna@beispiel.ch"
                value={form.recipientsInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipientsInput: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Eine E-Mail-Adresse pro Zeile oder durch Komma getrennt.
              </p>
            </div>

            {createError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {createError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                setCreateError(null)
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Wird erstellt…" : "Bericht erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
