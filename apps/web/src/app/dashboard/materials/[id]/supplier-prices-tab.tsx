"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconPlus,
  IconTrash,
  IconTruck,
  IconStar,
  IconClock,
  IconPackage,
  IconCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganization } from "@/hooks/use-organization"

// ── Types ──────────────────────────────────────────────────────────────
interface SupplierPriceRow {
  id: string
  supplierId: string
  supplierName: string
  unitPrice: number       // in cents
  currency: string
  minOrderQuantity: number | null
  leadTimeDays: number | null
  validFrom: string | null
  validTo: string | null
  createdAt: string
}

interface SupplierOption {
  id: string
  name: string
}

interface SupplierPricesTabProps {
  materialId: string
}

// ── Helpers ────────────────────────────────────────────────────────────
function formatCHF(cents: number): string {
  return `CHF ${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ── Component ──────────────────────────────────────────────────────────
export function SupplierPricesTab({ materialId }: SupplierPricesTabProps) {
  const { orgId } = useOrganization()

  const [prices, setPrices] = useState<SupplierPriceRow[]>([])
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [form, setForm] = useState({
    supplierId: "",
    unitPriceCHF: "",   // user enters CHF, converted to cents on save
    minOrderQuantity: "1",
    leadTimeDays: "",
    validFrom: "",
    validTo: "",
  })

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [pricesRes, suppliersRes] = await Promise.all([
        fetch(`/api/supplier-prices?materialId=${materialId}`, {
          headers: { "x-organization-id": orgId },
        }),
        fetch(`/api/suppliers`, {
          headers: { "x-organization-id": orgId },
        }),
      ])
      if (pricesRes.ok) {
        const data = await pricesRes.json() as SupplierPriceRow[]
        setPrices(Array.isArray(data) ? data : [])
      }
      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        const arr = Array.isArray(data) ? data : (data.data ?? [])
        setSupplierOptions(
          (arr as Array<{ id: string; name: string }>).map((s) => ({ id: s.id, name: s.name }))
        )
      }
    } catch {
      // silent — caller will see empty state
    } finally {
      setLoading(false)
    }
  }, [materialId, orgId])

  useEffect(() => { void load() }, [load])

  const bestPriceId = prices.length > 0
    ? prices.reduce((best, p) => p.unitPrice < best.unitPrice ? p : best).id
    : null

  const handleAdd = async () => {
    if (!orgId) return
    setError(null)
    const unitPriceCHF = parseFloat(form.unitPriceCHF.replace(",", "."))
    if (!form.supplierId) {
      setError("Bitte Lieferanten auswählen.")
      return
    }
    if (isNaN(unitPriceCHF) || unitPriceCHF < 0) {
      setError("Ungültiger Preis.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/supplier-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          supplierId: form.supplierId,
          materialId,
          unitPrice: Math.round(unitPriceCHF * 100),
          minOrderQuantity: parseInt(form.minOrderQuantity) || 1,
          leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : null,
          validFrom: form.validFrom || null,
          validTo: form.validTo || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? "Fehler beim Speichern")
      }
      setShowAdd(false)
      setForm({ supplierId: "", unitPriceCHF: "", minOrderQuantity: "1", leadTimeDays: "", validFrom: "", validTo: "" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!orgId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/supplier-prices/${id}`, {
        method: "DELETE",
        headers: { "x-organization-id": orgId },
      })
      if (res.ok) {
        setDeleteId(null)
        await load()
      }
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Lieferantenpreise</p>
          <p className="text-xs text-muted-foreground">
            {prices.length > 0
              ? `${prices.length} Bezugsquelle${prices.length !== 1 ? "n" : ""} — günstigster Preis hervorgehoben`
              : "Noch keine Preise erfasst"}
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
          <IconPlus className="size-3.5" />
          Preis hinzufügen
        </Button>
      </div>

      {/* Price table */}
      {prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconPackage className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Fügen Sie den ersten Lieferantenpreis hinzu.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lieferant</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[150px]">Preis/Stk.</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[130px]">Mindestmenge</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[130px]">Lieferzeit</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">Gültig bis</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((price) => {
              const isBest = price.id === bestPriceId
              return (
                <TableRow
                  key={price.id}
                  className={`group border-b border-border ${isBest ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-muted/50"}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconTruck className="size-3.5 text-muted-foreground/60 flex-shrink-0" />
                      <span className="font-medium text-sm">{price.supplierName}</span>
                      {isBest && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                        >
                          <IconStar className="size-2.5" />
                          Günstigster
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold text-sm ${isBest ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                      {formatCHF(price.unitPrice)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground font-mono">
                    {price.minOrderQuantity ?? 1}
                  </TableCell>
                  <TableCell className="text-right">
                    {price.leadTimeDays != null ? (
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <IconClock className="size-3.5" />
                        {price.leadTimeDays} {price.leadTimeDays === 1 ? "Tag" : "Tage"}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(price.validTo)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(price.id)}
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Add price dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(open) => {
          if (!open) {
            setShowAdd(false)
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lieferantenpreis hinzufügen</DialogTitle>
            <DialogDescription>
              Erfassen Sie einen neuen Preis für dieses Material.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Lieferant</Label>
              <Select
                value={form.supplierId}
                onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Lieferanten auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preis pro Stück (CHF)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.unitPriceCHF}
                  onChange={(e) => setForm((f) => ({ ...f, unitPriceCHF: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mindestbestellmenge</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={form.minOrderQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderQuantity: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Lieferzeit (Tage)</Label>
              <Input
                type="number"
                min="0"
                placeholder="z.B. 3"
                value={form.leadTimeDays}
                onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Gültig von</Label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gültig bis</Label>
                <Input
                  type="date"
                  value={form.validTo}
                  onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAdd(false); setError(null) }}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              <IconCheck className="size-4" />
              {saving ? "Speichern..." : "Preis speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preis löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie diesen Lieferantenpreis wirklich löschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && void handleDelete(deleteId)}
              disabled={deleting}
            >
              {deleting ? "Löschen..." : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
