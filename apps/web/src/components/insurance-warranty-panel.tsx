"use client"

import { useState, useEffect, useCallback } from "react"
import { useOrganization } from "@/hooks/use-organization"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconShield,
  IconCertificate,
  IconAlertTriangle,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type EntityType = "tool" | "material" | "vehicle"

interface InsuranceRecord {
  id: string
  provider: string
  policyNumber: string | null
  coverageAmount: number | null
  premium: number | null
  startDate: string | null
  endDate: string | null
  notes: string | null
}

interface WarrantyRecord {
  id: string
  provider: string | null
  warrantyStart: string | null
  warrantyEnd: string | null
  notes: string | null
}

interface InsuranceWarrantyPanelProps {
  entityType: EntityType
  entityId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatCents(cents: number | null): string {
  if (cents == null) return "—"
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

type ExpiryStatus = "active" | "expiring-soon" | "expired" | "unknown"

function getExpiryStatus(endDate: string | null): ExpiryStatus {
  if (!endDate) return "unknown"
  const end = new Date(endDate)
  const now = new Date()
  if (end < now) return "expired"
  const days = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 30) return "expiring-soon"
  return "active"
}

function ExpiryBadge({ endDate }: { endDate: string | null }) {
  const status = getExpiryStatus(endDate)
  if (status === "unknown" || !endDate) return null

  const config: Record<
    Exclude<ExpiryStatus, "unknown">,
    { label: string; className: string }
  > = {
    active: {
      label: "Aktiv",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    "expiring-soon": {
      label: "Läuft bald ab",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    expired: {
      label: "Abgelaufen",
      className: "bg-red-50 text-red-600 border-red-200",
    },
  }

  const { label, className } = config[status]
  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      {status !== "active" && (
        <IconAlertTriangle className="size-3 mr-1 inline" />
      )}
      {label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Insurance form dialog
// ---------------------------------------------------------------------------
interface InsuranceFormState {
  provider: string
  policyNumber: string
  coverageAmount: string
  premium: string
  startDate: string
  endDate: string
  notes: string
}

const emptyInsuranceForm: InsuranceFormState = {
  provider: "",
  policyNumber: "",
  coverageAmount: "",
  premium: "",
  startDate: "",
  endDate: "",
  notes: "",
}

function InsuranceDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: InsuranceRecord | null
  onSave: (data: InsuranceFormState) => Promise<void>
}) {
  const [form, setForm] = useState<InsuranceFormState>(emptyInsuranceForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              provider: initial.provider,
              policyNumber: initial.policyNumber ?? "",
              coverageAmount: initial.coverageAmount
                ? String(initial.coverageAmount / 100)
                : "",
              premium: initial.premium
                ? String(initial.premium / 100)
                : "",
              startDate: initial.startDate ?? "",
              endDate: initial.endDate ?? "",
              notes: initial.notes ?? "",
            }
          : emptyInsuranceForm
      )
      setError(null)
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!form.provider.trim()) {
      setError("Versicherungsträger ist erforderlich.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Versicherung bearbeiten" : "Versicherung hinzufügen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Versicherungsträger <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              placeholder="z. B. Zurich Versicherung"
            />
          </div>

          <div className="space-y-2">
            <Label>Policennummer</Label>
            <Input
              value={form.policyNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, policyNumber: e.target.value }))
              }
              placeholder="z. B. POL-123456"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Versicherungssumme (CHF)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.coverageAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coverageAmount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Prämie (CHF)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.premium}
                onChange={(e) =>
                  setForm((f) => ({ ...f, premium: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Beginn</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ablaufdatum</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notizen</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Weitere Informationen…"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Warranty form dialog
// ---------------------------------------------------------------------------
interface WarrantyFormState {
  provider: string
  warrantyStart: string
  warrantyEnd: string
  notes: string
}

const emptyWarrantyForm: WarrantyFormState = {
  provider: "",
  warrantyStart: "",
  warrantyEnd: "",
  notes: "",
}

function WarrantyDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: WarrantyRecord | null
  onSave: (data: WarrantyFormState) => Promise<void>
}) {
  const [form, setForm] = useState<WarrantyFormState>(emptyWarrantyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              provider: initial.provider ?? "",
              warrantyStart: initial.warrantyStart ?? "",
              warrantyEnd: initial.warrantyEnd ?? "",
              notes: initial.notes ?? "",
            }
          : emptyWarrantyForm
      )
      setError(null)
    }
  }, [open, initial])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Garantie bearbeiten" : "Garantie hinzufügen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Anbieter / Hersteller</Label>
            <Input
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({ ...f, provider: e.target.value }))
              }
              placeholder="z. B. Bosch, Hilti…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Garantiebeginn</Label>
              <Input
                type="date"
                value={form.warrantyStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, warrantyStart: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Garantieende</Label>
              <Input
                type="date"
                value={form.warrantyEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, warrantyEnd: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notizen</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Weitere Informationen zur Garantie…"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
export function InsuranceWarrantyPanel({
  entityType,
  entityId,
}: InsuranceWarrantyPanelProps) {
  const { orgId } = useOrganization()
  const [insurance, setInsurance] = useState<InsuranceRecord[]>([])
  const [warranty, setWarranty] = useState<WarrantyRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Insurance dialog
  const [insDialogOpen, setInsDialogOpen] = useState(false)
  const [editingIns, setEditingIns] = useState<InsuranceRecord | null>(null)

  // Warranty dialog
  const [warDialogOpen, setWarDialogOpen] = useState(false)
  const [editingWar, setEditingWar] = useState<WarrantyRecord | null>(null)

  const headers = orgId ? { "x-organization-id": orgId } : undefined
  const qs = `entityType=${entityType}&entityId=${entityId}`

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [insRes, warRes] = await Promise.all([
        fetch(`/api/insurance?${qs}`, { headers }),
        fetch(`/api/warranty?${qs}`, { headers }),
      ])
      if (insRes.ok) setInsurance(await insRes.json())
      if (warRes.ok) setWarranty(await warRes.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [orgId, qs]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  // Insurance save handler
  const handleSaveInsurance = async (form: InsuranceFormState) => {
    const payload = {
      entityType,
      entityId,
      provider: form.provider,
      policyNumber: form.policyNumber || null,
      coverageAmount: form.coverageAmount
        ? Math.round(parseFloat(form.coverageAmount) * 100)
        : null,
      premium: form.premium
        ? Math.round(parseFloat(form.premium) * 100)
        : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes || null,
    }

    if (editingIns) {
      const res = await fetch(`/api/insurance/${editingIns.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Fehler beim Aktualisieren")
      const updated = await res.json()
      setInsurance((prev) =>
        prev.map((i) => (i.id === editingIns.id ? updated : i))
      )
    } else {
      const res = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Fehler beim Erstellen")
      const created = await res.json()
      setInsurance((prev) => [...prev, created])
    }
    setEditingIns(null)
  }

  const handleDeleteInsurance = async (id: string) => {
    await fetch(`/api/insurance/${id}`, { method: "DELETE", headers })
    setInsurance((prev) => prev.filter((i) => i.id !== id))
  }

  // Warranty save handler
  const handleSaveWarranty = async (form: WarrantyFormState) => {
    const payload = {
      entityType,
      entityId,
      provider: form.provider || null,
      warrantyStart: form.warrantyStart || null,
      warrantyEnd: form.warrantyEnd || null,
      notes: form.notes || null,
    }

    if (editingWar) {
      const res = await fetch(`/api/warranty/${editingWar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Fehler beim Aktualisieren")
      const updated = await res.json()
      setWarranty((prev) =>
        prev.map((w) => (w.id === editingWar.id ? updated : w))
      )
    } else {
      const res = await fetch("/api/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Fehler beim Erstellen")
      const created = await res.json()
      setWarranty((prev) => [...prev, created])
    }
    setEditingWar(null)
  }

  const handleDeleteWarranty = async (id: string) => {
    await fetch(`/api/warranty/${id}`, { method: "DELETE", headers })
    setWarranty((prev) => prev.filter((w) => w.id !== id))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Insurance ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IconShield className="size-4 text-muted-foreground" />
              Versicherung
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setEditingIns(null)
                setInsDialogOpen(true)
              }}
            >
              <IconPlus className="size-3.5" />
              Hinzufügen
            </Button>
          </div>
        </CardHeader>

        {insurance.length === 0 ? (
          <CardContent className="pb-4">
            <p className="text-sm text-muted-foreground">
              Keine Versicherungseinträge vorhanden.
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-3 pb-4">
            {insurance.map((ins, idx) => (
              <div key={ins.id}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{ins.provider}</span>
                      <ExpiryBadge endDate={ins.endDate} />
                    </div>
                    {ins.policyNumber && (
                      <p className="text-xs font-mono text-muted-foreground">
                        Police: {ins.policyNumber}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      {ins.startDate && (
                        <span>Beginn: {formatDate(ins.startDate)}</span>
                      )}
                      {ins.endDate && (
                        <span>Ablauf: {formatDate(ins.endDate)}</span>
                      )}
                      {ins.coverageAmount != null && (
                        <span>Summe: {formatCents(ins.coverageAmount)}</span>
                      )}
                      {ins.premium != null && (
                        <span>Prämie: {formatCents(ins.premium)}</span>
                      )}
                    </div>
                    {ins.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                        {ins.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => {
                        setEditingIns(ins)
                        setInsDialogOpen(true)
                      }}
                    >
                      <IconEdit className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteInsurance(ins.id)}
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ── Warranty ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IconCertificate className="size-4 text-muted-foreground" />
              Garantie
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setEditingWar(null)
                setWarDialogOpen(true)
              }}
            >
              <IconPlus className="size-3.5" />
              Hinzufügen
            </Button>
          </div>
        </CardHeader>

        {warranty.length === 0 ? (
          <CardContent className="pb-4">
            <p className="text-sm text-muted-foreground">
              Keine Garantieeinträge vorhanden.
            </p>
          </CardContent>
        ) : (
          <CardContent className="space-y-3 pb-4">
            {warranty.map((war, idx) => (
              <div key={war.id}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {war.provider ?? "Garantie"}
                      </span>
                      <ExpiryBadge endDate={war.warrantyEnd} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      {war.warrantyStart && (
                        <span>Beginn: {formatDate(war.warrantyStart)}</span>
                      )}
                      {war.warrantyEnd && (
                        <span>Ende: {formatDate(war.warrantyEnd)}</span>
                      )}
                    </div>
                    {war.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                        {war.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => {
                        setEditingWar(war)
                        setWarDialogOpen(true)
                      }}
                    >
                      <IconEdit className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteWarranty(war.id)}
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Dialogs */}
      <InsuranceDialog
        open={insDialogOpen}
        onOpenChange={setInsDialogOpen}
        initial={editingIns}
        onSave={handleSaveInsurance}
      />
      <WarrantyDialog
        open={warDialogOpen}
        onOpenChange={setWarDialogOpen}
        initial={editingWar}
        onSave={handleSaveWarranty}
      />
    </div>
  )
}
