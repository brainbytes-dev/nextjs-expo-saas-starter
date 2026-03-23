"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconPlus,
  IconSearch,
  IconKey,
  IconCheck,
  IconX,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

// ── Types ──────────────────────────────────────────────────────────────

interface KeyItem {
  id: string
  number: string | null
  name: string
  barcode: string | null
  address: string | null
  quantity: number
  homeLocationId: string | null
  homeLocationName: string | null
  assignedToId: string | null
  assignedToName: string | null
  image: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface KeysResponse {
  data: KeyItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Location {
  id: string
  name: string
}

// ── Constants ─────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 20

// ── Page ───────────────────────────────────────────────────────────────
export default function KeysPage() {
  const t = useTranslations("keys")
  const tc = useTranslations("common")

  // Data state
  const [keys, setKeys] = useState<KeyItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter / pagination state
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    number: "",
    barcode: "",
    homeLocationId: "",
    address: "",
    quantity: 1,
    notes: "",
  })

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<KeyItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reference data
  const [locations, setLocations] = useState<Location[]>([])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch reference data once
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/locations")
        if (res.ok) {
          const data = await res.json()
          setLocations(Array.isArray(data) ? data : (data.data ?? []))
        }
      } catch {
        // silently fail
      }
    }
    fetchLocations()
  }, [])

  // Fetch keys
  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/keys?${params.toString()}`)
      if (res.ok) {
        const json: KeysResponse = await res.json()
        setKeys(json.data ?? [])
        setTotal(json.pagination?.total ?? 0)
      }
    } catch {
      // TODO: toast error
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  // Create handler
  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          number: createForm.number.trim() || null,
          barcode: createForm.barcode.trim() || null,
          homeLocationId: createForm.homeLocationId || null,
          address: createForm.address.trim() || null,
          quantity: createForm.quantity || 1,
          notes: createForm.notes.trim() || null,
        }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setCreateForm({ name: "", number: "", barcode: "", homeLocationId: "", address: "", quantity: 1, notes: "" })
        fetchKeys()
      }
    } catch {
      // TODO: toast error
    } finally {
      setCreating(false)
    }
  }, [createForm, fetchKeys])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/keys/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id))
        setTotal((prev) => prev - 1)
      }
    } catch {
      // TODO: toast error
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  // Stats computed from current total (server-side filtered)
  const assignedCount = keys.filter((k) => k.assignedToName).length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {t("title")} {assignedCount > 0 && <>· {assignedCount} {t("assigned")}</>}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          {t("addKey")}
        </Button>
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
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : keys.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconKey className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{t("noKeysFound")}</EmptyTitle>
                <EmptyDescription>
                  {debouncedSearch ? t("adjustSearch") : t("addFirstKey")}
                </EmptyDescription>
              </EmptyHeader>
              {!debouncedSearch && (
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <IconPlus className="size-4" />
                  {t("addKey")}
                </Button>
              )}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">{t("number")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("name")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("home")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("assignedTo")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[70px] text-right">{t("quantity")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-center">{t("isHome")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => {
                  const isHome = !key.assignedToName
                  return (
                    <TableRow key={key.id} className="group hover:bg-muted/80 border-b border-border">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {key.number ?? "\u2014"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{key.name}</p>
                          {key.address && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">{key.address}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {key.homeLocationName ?? "\u2014"}
                      </TableCell>
                      <TableCell>
                        {key.assignedToName ? (
                          <p className="text-sm font-medium text-foreground">{key.assignedToName}</p>
                        ) : (
                          <span className="text-muted-foreground text-sm">{"\u2014"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {key.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {isHome ? (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-secondary/10">
                            <IconCheck className="size-3.5 text-secondary" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary/10">
                            <IconX className="size-3.5 text-primary" />
                          </span>
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
                              <IconEdit className="size-4" /> {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(key)}
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

      {/* Pagination */}
      {!loading && keys.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * ITEMS_PER_PAGE + 1}&ndash;
            {Math.min(page * ITEMS_PER_PAGE, total)} {tc("of")} {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <IconChevronLeft className="size-4" />
              {tc("back")}
            </Button>
            <span className="min-w-[3rem] text-center text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc("next")}
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addKey")}</DialogTitle>
            <DialogDescription>
              {t("addFirstKey")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key-name">{t("name")} *</Label>
              <Input
                id="key-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("name")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="key-number">{t("number")}</Label>
                <Input
                  id="key-number"
                  value={createForm.number}
                  onChange={(e) => setCreateForm((f) => ({ ...f, number: e.target.value }))}
                  placeholder="SCH-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key-barcode">Barcode</Label>
                <Input
                  id="key-barcode"
                  value={createForm.barcode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, barcode: e.target.value }))}
                  placeholder="Barcode"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="key-location">{t("home")}</Label>
                <select
                  id="key-location"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={createForm.homeLocationId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, homeLocationId: e.target.value }))}
                >
                  <option value="">{"\u2014"}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key-quantity">{t("quantity")}</Label>
                <Input
                  id="key-quantity"
                  type="number"
                  min={1}
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key-address">{t("address")}</Label>
              <Input
                id="key-address"
                value={createForm.address}
                onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                placeholder={t("address")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key-notes">{t("notes")}</Label>
              <Textarea
                id="key-notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("notes")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createForm.name.trim()}>
              {creating ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc("delete")} — {deleteTarget?.name}</DialogTitle>
            <DialogDescription>
              {tc("deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
