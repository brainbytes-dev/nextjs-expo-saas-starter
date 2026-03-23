"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { useRouter, useParams } from "next/navigation"
import {
  IconArrowLeft,
  IconClipboardCheck,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Input } from "@/components/ui/input"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CountItem {
  id: string
  materialId: string
  materialName: string | null
  materialNumber: string | null
  materialUnit: string | null
  locationId: string
  locationName: string | null
  expectedQuantity: number
  countedQuantity: number | null
  difference: number | null
  countedAt: string | null
  notes: string | null
}

interface InventoryCountDetail {
  id: string
  name: string
  status: "draft" | "in_progress" | "completed" | "cancelled"
  locationId: string | null
  locationName: string | null
  startedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  items: CountItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_KEYS = ["draft", "in_progress", "completed", "cancelled"] as const

const STATUS_VARIANTS: Record<
  string,
  "secondary" | "default" | "outline" | "destructive"
> = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
}

/** Determine row color class based on difference relative to expected */
function diffClass(item: CountItem): string {
  if (item.countedQuantity === null) return ""
  if (item.difference === 0) return "bg-green-500/5"
  const pct =
    item.expectedQuantity === 0
      ? 100
      : Math.abs(item.difference!) / item.expectedQuantity * 100
  if (pct <= 10) return "bg-orange-500/5"
  return "bg-destructive/5"
}

function diffBadge(item: CountItem) {
  if (item.countedQuantity === null) return null
  const diff = item.difference ?? 0
  if (diff === 0) return (
    <span className="text-sm font-medium text-green-600">0</span>
  )
  const pct =
    item.expectedQuantity === 0
      ? 100
      : Math.abs(diff) / item.expectedQuantity * 100
  const color = pct <= 10 ? "text-orange-600" : "text-destructive"
  return (
    <span className={`text-sm font-medium ${color}`}>
      {diff > 0 ? "+" : ""}{diff}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Editable cell
// ---------------------------------------------------------------------------
interface EditableCellProps {
  item: CountItem
  readonly: boolean
  onSave: (itemId: string, value: number) => void
  clickToEditLabel: string
  inputPlaceholder: string
}

function EditableQuantityCell({ item, readonly, onSave, clickToEditLabel, inputPlaceholder }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(
    item.countedQuantity !== null ? String(item.countedQuantity) : ""
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = parseInt(value, 10)
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onSave(item.id, parsed)
    } else {
      // reset to previous
      setValue(item.countedQuantity !== null ? String(item.countedQuantity) : "")
    }
    setEditing(false)
  }

  if (readonly) {
    return (
      <span className="text-sm">
        {item.countedQuantity !== null ? item.countedQuantity : "—"}
      </span>
    )
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault()
            commit()
          }
          if (e.key === "Escape") {
            setValue(item.countedQuantity !== null ? String(item.countedQuantity) : "")
            setEditing(false)
          }
        }}
        className="h-7 w-24 text-sm"
      />
    )
  }

  return (
    <button
      onClick={() => { setValue(item.countedQuantity !== null ? String(item.countedQuantity) : ""); setEditing(true) }}
      className="min-h-[28px] min-w-[4rem] rounded border border-dashed border-border px-2 py-1 text-left text-sm hover:border-primary hover:bg-primary/5"
      title={clickToEditLabel}
    >
      {item.countedQuantity !== null ? item.countedQuantity : (
        <span className="text-muted-foreground">{inputPlaceholder}</span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function InventoryDetailPage() {
  const t = useTranslations("inventoryDetail")
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const countId = params.id

  const [count, setCount] = useState<InventoryCountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Local dirty map: itemId → countedQuantity
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, number>>(
    new Map()
  )

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchCount = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/inventory-counts/${countId}`)
      if (res.ok) {
        const data = await res.json()
        setCount(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [countId])

  useEffect(() => {
    void fetchCount()
  }, [fetchCount])

  // ---------------------------------------------------------------------------
  // Derived display items (pending updates layered over server data)
  // ---------------------------------------------------------------------------
  const displayItems: CountItem[] = (count?.items ?? []).map((item) => {
    if (pendingUpdates.has(item.id)) {
      const counted = pendingUpdates.get(item.id)!
      return {
        ...item,
        countedQuantity: counted,
        difference: counted - item.expectedQuantity,
      }
    }
    return item
  })

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  const totalItems = displayItems.length
  const countedItems = displayItems.filter((i) => i.countedQuantity !== null).length
  const discrepancies = displayItems.filter(
    (i) => i.countedQuantity !== null && i.difference !== 0
  ).length

  // ---------------------------------------------------------------------------
  // Save pending updates
  // ---------------------------------------------------------------------------
  const flushPending = useCallback(async () => {
    if (pendingUpdates.size === 0) return
    setSaving(true)
    try {
      const updates = Array.from(pendingUpdates.entries()).map(([id, countedQuantity]) => ({
        id,
        countedQuantity,
      }))
      const res = await fetch(`/api/inventory-counts/${countId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      if (res.ok) {
        setPendingUpdates(new Map())
        await fetchCount()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }, [countId, pendingUpdates, fetchCount])

  // Auto-save every 5 seconds if there are pending updates
  useEffect(() => {
    if (pendingUpdates.size === 0) return
    const timer = setTimeout(() => { void flushPending() }, 5000)
    return () => clearTimeout(timer)
  }, [pendingUpdates, flushPending])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCellSave = (itemId: string, value: number) => {
    setPendingUpdates((prev) => new Map(prev).set(itemId, value))
  }

  const handleSaveNow = async () => {
    await flushPending()
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      // Flush any pending cell edits first
      if (pendingUpdates.size > 0) await flushPending()

      // Single atomic call: marks count completed + creates all stock corrections
      const res = await fetch(`/api/inventory-counts/${countId}/complete`, {
        method: "POST",
      })
      if (!res.ok) return

      setCompleteOpen(false)
      router.push("/dashboard/inventory")
    } catch {
      // silently fail
    } finally {
      setCompleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const readonly =
    count?.status === "completed" || count?.status === "cancelled"

  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  if (!count) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/inventory")}
        >
          <IconArrowLeft className="size-4" />
          {t("back")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit gap-1.5 text-muted-foreground"
            onClick={() => router.push("/dashboard/inventory")}
          >
            <IconArrowLeft className="size-4" />
            {t("overview")}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{count.name}</h1>
            <Badge variant={STATUS_VARIANTS[count.status] ?? "secondary"}>
              {t(`status.${count.status}` as Parameters<typeof t>[0]) || count.status}
            </Badge>
          </div>
          {count.locationName && (
            <p className="text-sm text-muted-foreground">
              {t("location")}: {count.locationName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendingUpdates.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNow}
              disabled={saving}
            >
              {saving ? t("saving") : t("saveCount", { count: pendingUpdates.size })}
            </Button>
          )}
          {!readonly && count.status === "in_progress" && (
            <Button
              onClick={() => setCompleteOpen(true)}
              disabled={countedItems === 0}
            >
              <IconClipboardCheck className="size-4" />
              {t("completeCount")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalItems")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span className="text-2xl font-semibold">{totalItems}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("counted")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span className="text-2xl font-semibold text-green-600">{countedItems}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("pending")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span className="text-2xl font-semibold text-muted-foreground">
              {totalItems - countedItems}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("discrepancies")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span
              className={`text-2xl font-semibold ${discrepancies > 0 ? "text-destructive" : "text-green-600"}`}
            >
              {discrepancies}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">
              {t("noItems")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colMaterial")}</TableHead>
                <TableHead>{t("colLocation")}</TableHead>
                <TableHead className="text-right">{t("colExpected")}</TableHead>
                <TableHead className="text-right">{t("colActual")}</TableHead>
                <TableHead className="text-right">{t("colDifference")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item) => (
                <TableRow key={item.id} className={diffClass(item)}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {item.materialName ?? "—"}
                      </span>
                      {item.materialNumber && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.materialNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.locationName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">
                      {item.expectedQuantity}{" "}
                      <span className="text-muted-foreground">{item.materialUnit ?? "Stk"}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableQuantityCell
                      item={item}
                      readonly={readonly}
                      onSave={handleCellSave}
                      clickToEditLabel={t("clickToEdit")}
                      inputPlaceholder={t("input")}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {item.countedQuantity !== null ? (
                      item.difference === 0 ? (
                        <IconCheck className="ml-auto size-4 text-green-600" />
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <IconAlertTriangle className="size-3.5 text-destructive" />
                          {diffBadge(item)}
                        </div>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Complete confirmation dialog */}
      <Dialog
        open={completeOpen}
        onOpenChange={(open) => { if (!open) setCompleteOpen(false) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("completeCount")}</DialogTitle>
            <DialogDescription>
              {discrepancies > 0 ? (
                <>
                  {t("completeDiscrepancies", { count: discrepancies })}
                </>
              ) : (
                <>
                  {t("completeAllMatch")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("totalItems")}</span>
              <span className="font-medium">{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("counted")}</span>
              <span className="font-medium">{countedItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("discrepancies")}</span>
              <span className={`font-medium ${discrepancies > 0 ? "text-destructive" : "text-green-600"}`}>
                {discrepancies}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteOpen(false)}
              disabled={completing}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleComplete} disabled={completing}>
              {completing ? t("completing") : t("completeCount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
