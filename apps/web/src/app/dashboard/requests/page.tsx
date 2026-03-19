"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconPlus,
  IconPackage,
  IconCheck,
  IconX,
  IconRefresh,
  IconUser,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconShoppingCart,
  IconSearch,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MaterialSearchResult {
  id: string
  name: string
  number: string | null
  unit: string
}

interface MaterialRequestEntry {
  id: string
  materialId: string | null
  materialName: string
  quantity: number
  unit: string | null
  reason: string | null
  priority: string
  status: string
  notes: string | null
  approvedAt: string | null
  approvedById: string | null
  requesterId: string
  requesterName: string | null
  requesterEmail: string | null
  createdAt: string
  updatedAt: string
}

type Priority = "low" | "normal" | "high" | "urgent"
type RequestStatus = "pending" | "approved" | "rejected" | "ordered" | "delivered"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function priorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300">Dringend</Badge>
    case "high":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300">Hoch</Badge>
    case "normal":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Normal</Badge>
    case "low":
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">Niedrig</Badge>
    default:
      return <Badge variant="outline">{priority}</Badge>
  }
}

function priorityIcon(priority: string) {
  switch (priority) {
    case "urgent":
      return <IconAlertCircle className="size-4 text-red-500" />
    case "high":
      return <IconAlertTriangle className="size-4 text-orange-500" />
    case "normal":
      return <IconInfoCircle className="size-4 text-blue-500" />
    default:
      return null
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Ausstehend</Badge>
    case "approved":
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">Genehmigt</Badge>
    case "rejected":
      return <Badge variant="destructive">Abgelehnt</Badge>
    case "ordered":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Bestellt</Badge>
    case "delivered":
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">Geliefert</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const STATUS_FLOW = ["pending", "approved", "ordered", "delivered"] as const

function statusStep(status: string) {
  const idx = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number])
  return idx === -1 ? 0 : idx
}

// ---------------------------------------------------------------------------
// Create Request Dialog
// ---------------------------------------------------------------------------
function CreateRequestDialog({
  open,
  onClose,
  onCreated,
  prefillMaterialId,
  prefillMaterialName,
  prefillUnit,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  prefillMaterialId?: string
  prefillMaterialName?: string
  prefillUnit?: string
}) {
  const [materialSearch, setMaterialSearch] = useState(prefillMaterialName || "")
  const [materialId, setMaterialId] = useState(prefillMaterialId || "")
  const [materialName, setMaterialName] = useState(prefillMaterialName || "")
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState(prefillUnit || "Stk")
  const [reason, setReason] = useState("")
  const [priority, setPriority] = useState<Priority>("normal")
  const [searchResults, setSearchResults] = useState<MaterialSearchResult[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setMaterialSearch(prefillMaterialName || "")
      setMaterialId(prefillMaterialId || "")
      setMaterialName(prefillMaterialName || "")
      setUnit(prefillUnit || "Stk")
      setQuantity(1)
      setReason("")
      setPriority("normal")
      setSearchResults([])
    }
  }, [open, prefillMaterialId, prefillMaterialName, prefillUnit])

  const searchMaterials = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    try {
      const res = await fetch(`/api/materials?search=${encodeURIComponent(q)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : (data.data ?? []))
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!materialId) searchMaterials(materialSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [materialSearch, materialId, searchMaterials])

  const handleSubmit = async () => {
    const name = materialName.trim() || materialSearch.trim()
    if (!name || quantity < 1) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: materialId || undefined,
          materialName: name,
          quantity,
          unit,
          reason: reason.trim() || undefined,
          priority,
        }),
      })
      if (res.ok) {
        onCreated()
        onClose()
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  const selectMaterial = (m: MaterialSearchResult) => {
    setMaterialId(m.id)
    setMaterialName(m.name)
    setMaterialSearch(m.name)
    setUnit(m.unit)
    setSearchResults([])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Material anfragen</DialogTitle>
          <DialogDescription>
            Bestehende Materialien suchen oder neuen Bedarf erfassen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Material search */}
          <div className="space-y-2">
            <Label>Material</Label>
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Material suchen oder neuen Namen eingeben…"
                className="pl-8"
                value={materialSearch}
                onChange={(e) => {
                  setMaterialSearch(e.target.value)
                  setMaterialId("")
                  setMaterialName("")
                }}
              />
            </div>
            {materialId && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <IconCheck className="size-3.5" />
                Verknüpft mit vorhandenem Material
              </p>
            )}
            {searchResults.length > 0 && !materialId && (
              <div className="rounded-md border shadow-sm bg-background overflow-hidden">
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left border-b last:border-b-0"
                    onClick={() => selectMaterial(m)}
                  >
                    <IconPackage className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{m.name}</span>
                    {m.number && (
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {m.number}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Menge</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label>Einheit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Stk, kg, m…"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priorität</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="urgent">Dringend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>
              Begründung{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              placeholder="Warum wird das Material benötigt?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[72px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              (!materialSearch.trim() && !materialName.trim()) ||
              quantity < 1
            }
          >
            <IconPlus className="size-4" />
            {submitting ? "Wird gespeichert…" : "Anfrage stellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Reject Dialog
// ---------------------------------------------------------------------------
function RejectDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (notes: string) => void
}) {
  const [notes, setNotes] = useState("")

  useEffect(() => {
    async function reset() {
      setNotes("")
    }
    if (open) reset()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Anfrage ablehnen</DialogTitle>
          <DialogDescription>
            Optional eine Begründung angeben.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            placeholder="Begründung (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(notes)}>
            <IconX className="size-4" />
            Ablehnen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// RequestsTable
// ---------------------------------------------------------------------------
function RequestsTable({
  requests,
  isAdmin,
  onApprove,
  onReject,
  onStatusChange,
  onDelete,
  onCreateOrder,
}: {
  requests: MaterialRequestEntry[]
  isAdmin: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onCreateOrder: (req: MaterialRequestEntry) => void
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IconPackage className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Keine Anfragen vorhanden</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Material</TableHead>
          {isAdmin && <TableHead>Angefragt von</TableHead>}
          <TableHead>Menge</TableHead>
          <TableHead>Priorität</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Datum</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <TableRow key={req.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {priorityIcon(req.priority)}
                <div>
                  <p className="font-medium text-sm">{req.materialName}</p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {req.reason}
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-destructive truncate max-w-[180px]">
                      Notiz: {req.notes}
                    </p>
                  )}
                </div>
              </div>
            </TableCell>
            {isAdmin && (
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <IconUser className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">
                    {req.requesterName || req.requesterEmail || "Unbekannt"}
                  </span>
                </div>
              </TableCell>
            )}
            <TableCell className="text-sm">
              {req.quantity} {req.unit || "Stk"}
            </TableCell>
            <TableCell>{priorityBadge(req.priority)}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {statusBadge(req.status)}
                {/* Progress dots */}
                <div className="flex items-center gap-1 mt-0.5">
                  {STATUS_FLOW.map((s, i) => (
                    <div
                      key={s}
                      className={`size-1.5 rounded-full ${
                        i <= statusStep(req.status) && req.status !== "rejected"
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(req.createdAt)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1 flex-wrap">
                {isAdmin && req.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => onApprove(req.id)}
                    >
                      <IconCheck className="size-3.5" />
                      Genehmigen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                      onClick={() => onReject(req.id)}
                    >
                      <IconX className="size-3.5" />
                      Ablehnen
                    </Button>
                  </>
                )}
                {isAdmin && req.status === "approved" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                      onClick={() => onCreateOrder(req)}
                    >
                      <IconShoppingCart className="size-3.5" />
                      Bestellung
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => onStatusChange(req.id, "ordered")}
                    >
                      Als bestellt markieren
                    </Button>
                  </>
                )}
                {isAdmin && req.status === "ordered" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => onStatusChange(req.id, "delivered")}
                  >
                    Als geliefert markieren
                  </Button>
                )}
                {!isAdmin && req.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(req.id)}
                  >
                    Löschen
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<MaterialRequestEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)

  // We treat the user as admin based on whether they can see all requests.
  // In a real app you'd get this from a session hook.
  const isAdmin = true // TODO: wire to actual session role

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/material-requests?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async (id: string) => {
    await fetch(`/api/material-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })
    load()
  }

  const handleReject = async (id: string, notes: string) => {
    await fetch(`/api/material-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", notes: notes || null }),
    })
    setRejectId(null)
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/material-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/material-requests/${id}`, { method: "DELETE" })
    load()
  }

  const handleCreateOrder = (req: MaterialRequestEntry) => {
    const params = new URLSearchParams()
    if (req.materialId) params.set("materialId", req.materialId)
    params.set("materialName", req.materialName)
    params.set("quantity", String(req.quantity))
    params.set("requestId", req.id)
    router.push(`/dashboard/orders/new?${params}`)
  }

  const myRequests = requests // would filter by session.user.id in real implementation
  const pendingCount = requests.filter((r) => r.status === "pending").length

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materialanfragen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anfragen für Material-Nachbestellungen verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load}>
            <IconRefresh className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <IconPlus className="size-4" />
            Material anfragen
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Ausstehend", status: "pending", cls: "text-yellow-600" },
          { label: "Genehmigt", status: "approved", cls: "text-green-600" },
          { label: "Abgelehnt", status: "rejected", cls: "text-destructive" },
          { label: "Bestellt", status: "ordered", cls: "text-blue-600" },
          { label: "Geliefert", status: "delivered", cls: "text-gray-600" },
        ].map(({ label, status, cls }) => (
          <Card key={status}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${cls}`}>
                {requests.filter((r) => r.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | RequestStatus)}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="approved">Genehmigt</SelectItem>
            <SelectItem value="rejected">Abgelehnt</SelectItem>
            <SelectItem value="ordered">Bestellt</SelectItem>
            <SelectItem value="delivered">Geliefert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs: All (admin) / Mine (user) */}
      <Tabs defaultValue={isAdmin ? "all" : "mine"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="all">
              Alle Anfragen
              {pendingCount > 0 && (
                <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="mine">Meine Anfragen</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="all">
            <Card>
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <RequestsTable
                  requests={requests}
                  isAdmin={true}
                  onApprove={handleApprove}
                  onReject={(id) => setRejectId(id)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onCreateOrder={handleCreateOrder}
                />
              )}
            </Card>
          </TabsContent>
        )}

        <TabsContent value="mine">
          <Card>
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <RequestsTable
                requests={myRequests}
                isAdmin={false}
                onApprove={handleApprove}
                onReject={(id) => setRejectId(id)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onCreateOrder={handleCreateOrder}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateRequestDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={load}
      />

      <RejectDialog
        open={rejectId !== null}
        onClose={() => setRejectId(null)}
        onConfirm={(notes) => {
          if (rejectId) handleReject(rejectId, notes)
        }}
      />
    </div>
  )
}
