"use client"

import { useState, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconDownload,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconHistory,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ActivityEntry {
  id: string
  objectType: string
  objectId: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
  userId: string | null
  userName: string | null
  userEmail: string | null
}

interface PageResponse {
  data: ActivityEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const OBJECT_TYPE_KEYS: string[] = [
  "material", "tool", "location", "key", "commission", "supplier", "order", "task",
]

const PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function downloadCsv(
  headers: string[],
  rows: (string | null | undefined)[][],
  filename: string
) {
  const lines = [
    headers.join(";"),
    ...rows.map((row) =>
      row
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";")
    ),
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ActivityLogPage() {
  const t = useTranslations("activityLog")
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [objectTypeFilter, setObjectTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          pageSize: String(PAGE_SIZE),
        })
        if (search) params.set("search", search)
        if (objectTypeFilter !== "all") params.set("objectType", objectTypeFilter)
        if (dateFrom) params.set("from", dateFrom)
        if (dateTo) params.set("to", dateTo)

        const res = await fetch(`/api/activity?${params.toString()}`)
        if (!res.ok) throw new Error(t("loadError"))
        const data: PageResponse = await res.json()
        setEntries(data.data)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      } catch (err) {
        setError(err instanceof Error ? err.message : t("unknownError"))
      } finally {
        setLoading(false)
      }
    },
    [search, objectTypeFilter, dateFrom, dateTo]
  )

  // Re-fetch when filters change, reset to page 1
  useEffect(() => {
    void fetchPage(1)
  }, [fetchPage])

  const handleExport = async () => {
    setExporting(true)
    try {
      // Fetch all matching rows (up to 5000) for export
      const params = new URLSearchParams({ page: "1", pageSize: "5000" })
      if (search) params.set("search", search)
      if (objectTypeFilter !== "all") params.set("objectType", objectTypeFilter)
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)

      const res = await fetch(`/api/activity?${params.toString()}`)
      if (!res.ok) throw new Error(t("exportFailed"))
      const data: PageResponse = await res.json()

      downloadCsv(
        [t("colTimestamp"), t("colUser"), t("colType"), t("colObjectId"), t("colField"), t("colOldValue"), t("colNewValue")],
        data.data.map((e) => [
          formatDateTime(e.createdAt),
          e.userName ?? e.userEmail ?? "",
          t(`objectType.${e.objectType}` as Parameters<typeof t>[0]) || e.objectType,
          e.objectId,
          e.field ?? "",
          e.oldValue ?? "",
          e.newValue ?? "",
        ]),
        `aktivitaetsprotokoll-${new Date().toISOString().slice(0, 10)}.csv`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t("exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {t("breadcrumb")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <IconHistory className="size-6 text-muted-foreground" />
            {t("title")}
          </h1>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-sm"
          onClick={handleExport}
          disabled={exporting || loading}
        >
          {exporting ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconDownload className="size-4" />
          )}
          {t("exportCsv")}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={objectTypeFilter}
          onValueChange={(v) => setObjectTypeFilter(v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {OBJECT_TYPE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`objectType.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            {t("from")}
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">
            {t("to")}
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <IconHistory className="size-10 opacity-20" />
              <p className="text-sm">{t("noEntries")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">
                    {t("colTimestamp")}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px]">
                    {t("colUser")}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">
                    {t("colObjectType")}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">
                    {t("colField")}
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("colChange")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="hover:bg-muted/80 border-b border-border"
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.userName ?? (
                        <span className="text-muted-foreground italic text-xs">
                          {entry.userEmail ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {t(`objectType.${entry.objectType}`, { defaultValue: entry.objectType })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">
                        {entry.field ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        {entry.oldValue ? (
                          <span className="text-muted-foreground line-through">
                            {entry.oldValue}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">{t("empty")}</span>
                        )}
                        <IconArrowRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="font-medium text-foreground">
                          {entry.newValue ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? t("noEntries")
            : t("pagination", { from, to, total: total.toLocaleString("de-CH") })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => void fetchPage(page - 1)}
            disabled={page <= 1 || loading}
          >
            <IconChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-xs tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => void fetchPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            <IconChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
