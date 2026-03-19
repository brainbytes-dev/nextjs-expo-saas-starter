"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconChevronRight,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { StarDisplay } from "@/components/star-rating"

// ── Types ──────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string
  name: string
  supplierNumber: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
}

interface SupplierWithRating extends Supplier {
  avgRating: number | null
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<SupplierWithRating[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    supplierNumber: "",
    contactPerson: "",
    email: "",
    phone: "",
  })

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/suppliers?limit=200")
      if (!res.ok) return
      const json = await res.json() as { data: Supplier[] }
      const list: Supplier[] = json.data ?? []

      // Fetch ratings for each supplier in parallel (cap at 50)
      const slice = list.slice(0, 50)
      const ratingResults = await Promise.allSettled(
        slice.map((s) =>
          fetch(`/api/suppliers/${s.id}/ratings`)
            .then((r) => r.ok ? r.json() : null)
            .catch(() => null)
        )
      )

      const enriched: SupplierWithRating[] = list.map((s, i) => {
        const ratingData = i < 50 && ratingResults[i]?.status === "fulfilled"
          ? (ratingResults[i].value as { averages?: { overall?: number | null } } | null)
          : null
        return {
          ...s,
          avgRating: ratingData?.averages?.overall ?? null,
        }
      })

      setItems(enriched)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSuppliers()
  }, [loadSuppliers])

  const filtered = items.filter((item) =>
    [item.name, item.supplierNumber, item.contactPerson, item.email]
      .some((v) => (v ?? "").toLowerCase().includes(search.toLowerCase()))
  )

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          supplierNumber: form.supplierNumber || null,
          contactPerson: form.contactPerson || null,
          email: form.email || null,
          phone: form.phone || null,
        }),
      })
      if (!res.ok) return
      const created = await res.json() as Supplier
      setItems((prev) => [{ ...created, avgRating: null }, ...prev])
      setForm({ name: "", supplierNumber: "", contactPerson: "", email: "", phone: "" })
      setDialogOpen(false)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Lieferant wirklich löschen?")) return
    try {
      await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lieferanten</h1>
          <p className="text-muted-foreground text-sm mt-1">Stammdaten verwalten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <IconPlus className="mr-2 size-4" />
              Lieferant hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lieferant hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Hilti AG"
                />
              </div>
              <div className="grid gap-2">
                <Label>Lieferantennummer</Label>
                <Input
                  value={form.supplierNumber}
                  onChange={(e) => setForm({ ...form, supplierNumber: e.target.value })}
                  placeholder="LF-001"
                />
              </div>
              <div className="grid gap-2">
                <Label>Kontaktperson</Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={!form.name.trim() || saving}>
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Lieferant suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Keine Lieferanten gefunden
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Kontaktperson</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Bewertung</TableHead>
                    <TableHead className="w-[120px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/master/suppliers/${item.id}`)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {item.supplierNumber ?? "—"}
                      </TableCell>
                      <TableCell>{item.contactPerson ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.phone ?? "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StarDisplay value={item.avgRating} size="sm" />
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => router.push(`/dashboard/master/suppliers/${item.id}`)}
                          >
                            <IconChevronRight className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <IconTrash className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
