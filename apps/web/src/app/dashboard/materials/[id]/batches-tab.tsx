"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  IconArrowDown,
  IconArrowUp,
  IconTransfer,
  IconAdjustmentsAlt,
  IconPackage,
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StockChange {
  id: string
  changeType: string
  quantity: number
  previousQuantity: number | null
  newQuantity: number | null
  batchNumber: string | null
  serialNumber: string | null
  locationId: string
  locationName: string | null
  userId: string | null
  userName: string | null
  notes: string | null
  commissionId: string | null
  orderId: string | null
  createdAt: string
}

interface BatchEntry {
  id: string
  locationId: string
  locationName: string | null
  quantity: number
  batchNumber: string | null
  serialNumber: string | null
  expiryDate: string | null
  minStock: number | null
  maxStock: number | null
  history: StockChange[]
}

interface BatchData {
  material: { id: string; name: string; unit: string }
  batches: BatchEntry[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 30
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function BatchStatusBadge({
  quantity,
  expiryDate,
  t,
}: {
  quantity: number
  expiryDate: string | null
  t: (key: string) => string
}) {
  if (isExpired(expiryDate)) {
    return (
      <Badge variant="destructive" className="text-xs">
        {t("expired")}
      </Badge>
    )
  }
  if (quantity === 0) {
    return (
      <Badge
        variant="outline"
        className="text-xs text-muted-foreground border-muted-foreground/30"
      >
        {t("emptyBatch")}
      </Badge>
    )
  }
  if (isExpiringSoon(expiryDate)) {
    return (
      <Badge className="bg-orange-100 text-orange-800 border border-orange-300 text-xs dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800">
        {t("expiringSoon")}
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
      {t("active")}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Change type icon
// ---------------------------------------------------------------------------
function ChangeIcon({ changeType }: { changeType: string }) {
  switch (changeType) {
    case "in":
      return <IconArrowDown className="size-3.5 text-emerald-600" />
    case "out":
      return <IconArrowUp className="size-3.5 text-orange-600" />
    case "transfer":
      return <IconTransfer className="size-3.5 text-blue-600" />
    case "correction":
    case "inventory":
      return <IconAdjustmentsAlt className="size-3.5 text-slate-500" />
    default:
      return <IconPackage className="size-3.5 text-muted-foreground" />
  }
}

function changeTypeLabel(changeType: string, t: (key: string) => string): string {
  const key = `changeType.${changeType}`
  const translated = t(key)
  return translated === key ? changeType : translated
}

// ---------------------------------------------------------------------------
// Expanded history row
// ---------------------------------------------------------------------------
function HistoryTimeline({
  history,
  unit,
  t,
}: {
  history: StockChange[]
  unit: string
  t: (key: string) => string
}) {
  if (history.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        {t("noHistory")}
      </p>
    )
  }

  return (
    <div className="relative pl-3">
      <span
        className="absolute left-6 top-0 bottom-0 w-px bg-border"
        aria-hidden="true"
      />
      <ol className="space-y-0">
        {history.map((change) => (
          <li key={change.id} className="relative flex gap-3 py-3">
            <div className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background">
              <ChangeIcon changeType={change.changeType} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">
                  {changeTypeLabel(change.changeType, t)}
                </p>
                <span
                  className={`text-xs font-semibold ${
                    change.quantity > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-orange-700 dark:text-orange-400"
                  }`}
                >
                  {change.quantity > 0 ? "+" : ""}
                  {change.quantity} {unit}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDateTime(change.createdAt)}
                {change.userName && <span className="ml-1.5">&middot; {change.userName}</span>}
                {change.locationName && (
                  <span className="ml-1.5">&middot; {change.locationName}</span>
                )}
              </p>
              {change.previousQuantity != null && change.newQuantity != null && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("stock")}: {change.previousQuantity} &rarr; {change.newQuantity} {unit}
                </p>
              )}
              {change.notes && (
                <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                  {change.notes}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function BatchesTab({
  materialId,
  unit,
}: {
  materialId: string
  unit: string
}) {
  const t = useTranslations("batchesTab")
  const router = useRouter()
  const [data, setData] = useState<BatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/materials/${materialId}/batches`)
      if (!res.ok) {
        setError(t("loadError"))
        return
      }
      const json: BatchData = await res.json()
      setData(json)
    } catch {
      setError(t("connectionError"))
    } finally {
      setLoading(false)
    }
  }, [materialId])

  useEffect(() => {
    void load()
  }, [load])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Loading
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-destructive">
        <IconAlertTriangle className="size-4 shrink-0" />
        {error}
      </div>
    )
  }

  const batches = data?.batches ?? []

  const noBatchSerialEntries = batches.filter(
    (b) => !b.batchNumber && !b.serialNumber
  )
  const trackedEntries = batches.filter(
    (b) => b.batchNumber || b.serialNumber
  )

  if (trackedEntries.length === 0 && noBatchSerialEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <IconPackage className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground font-medium">
          {t("noStock")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("noStockHint")}
        </p>
      </div>
    )
  }

  if (trackedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm text-muted-foreground font-medium">
          {t("noBatchSerial")}
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          {t("noBatchSerialHint", { count: noBatchSerialEntries.length })}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>{t("colBatchSerial")}</TableHead>
            <TableHead>{t("colLocation")}</TableHead>
            <TableHead>{t("colQuantity")}</TableHead>
            <TableHead>{t("colExpiryDate")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            <TableHead className="w-16 text-right">{t("colTrace")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trackedEntries.map((batch) => {
            const isExpanded = expandedRows.has(batch.id)
            const expired = isExpired(batch.expiryDate)
            const expiring = isExpiringSoon(batch.expiryDate)

            return (
              <>
                <TableRow
                  key={batch.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(batch.id)}
                >
                  <TableCell className="py-2">
                    {isExpanded ? (
                      <IconChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <IconChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-0.5">
                      {batch.batchNumber && (
                        <span className="font-mono text-xs font-medium">
                          CH: {batch.batchNumber}
                        </span>
                      )}
                      {batch.serialNumber && (
                        <span className="font-mono text-xs text-muted-foreground">
                          SN: {batch.serialNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {batch.locationName ?? "\u2014"}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="font-semibold">{batch.quantity}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      {(expired || expiring) && (
                        <IconAlertTriangle
                          className={
                            expired
                              ? "size-3.5 text-destructive"
                              : "size-3.5 text-orange-500"
                          }
                        />
                      )}
                      <span
                        className={
                          expired
                            ? "text-xs font-medium text-destructive"
                            : expiring
                              ? "text-xs font-medium text-orange-700 dark:text-orange-400"
                              : "text-xs"
                        }
                      >
                        {formatDate(batch.expiryDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <BatchStatusBadge
                      quantity={batch.quantity}
                      expiryDate={batch.expiryDate}
                      t={t}
                    />
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        const params = new URLSearchParams()
                        if (batch.batchNumber) params.set("batch", batch.batchNumber)
                        if (batch.serialNumber) params.set("serial", batch.serialNumber)
                        router.push(`/dashboard/traceability?${params.toString()}`)
                      }}
                      title={t("showTraceability")}
                    >
                      <IconExternalLink className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Expanded history */}
                {isExpanded && (
                  <TableRow key={`${batch.id}-history`}>
                    <TableCell />
                    <TableCell colSpan={6} className="py-0 pb-4">
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {t("bookingHistory")}
                        </p>
                        <HistoryTimeline
                          history={batch.history}
                          unit={unit}
                          t={t}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
