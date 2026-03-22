"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconClipboardText,
  IconClockHour5,
  IconLoader2,
  IconPrinter,
  IconMail,
  IconPackage,
  IconTool,
  IconClipboardList,
  IconFileInvoice,
  IconArrowUp,
  IconArrowDown,
  IconArrowsTransferDown,
  IconAdjustments,
  IconUser,
  IconSun,
  IconSunset2,
  IconMoon,
  IconAlertCircle,
  IconNotes,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StockChangeRow {
  id: string
  changeType: string
  quantity: number
  notes: string | null
  createdAt: string
  materialName: string | null
  materialNumber: string | null
  locationName: string | null
  userId: string | null
  userName: string | null
}

interface ToolBookingRow {
  id: string
  bookingType: string
  notes: string | null
  createdAt: string
  toolName: string | null
  toolNumber: string | null
  userId: string | null
  userName: string | null
}

interface CommissionRow {
  id: string
  name: string
  number: number | null
  manualNumber: string | null
  status: string | null
  createdAt: string
  updatedAt: string
}

interface OrderRow {
  id: string
  orderNumber: string | null
  ownOrderNumber: string | null
  status: string | null
  orderDate: string | null
  totalAmount: number | null
  currency: string | null
  supplierName: string | null
  notes: string | null
}

interface Summary {
  totalStockChanges: number
  inCount: number
  outCount: number
  transferCount: number
  correctionCount: number
  checkoutCount: number
  checkinCount: number
  openCommissions: number
  openOrders: number
}

interface HandoverData {
  date: string
  shift: string
  shiftStart: string
  shiftEnd: string
  summary: Summary
  stockChanges: StockChangeRow[]
  toolBookings: ToolBookingRow[]
  openCommissions: CommissionRow[]
  openOrders: OrderRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtTime(d: string): string {
  return new Date(d).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function changeTypeIcon(type: string) {
  switch (type) {
    case "in":
      return <IconArrowUp className="size-3.5 text-green-600" />
    case "out":
      return <IconArrowDown className="size-3.5 text-red-500" />
    case "transfer":
      return <IconArrowsTransferDown className="size-3.5 text-blue-500" />
    default:
      return <IconAdjustments className="size-3.5 text-muted-foreground" />
  }
}

const SHIFT_CONFIG = {
  early: { icon: IconSun, hours: "06:00–14:00" },
  late: { icon: IconSunset2, hours: "14:00–22:00" },
  night: { icon: IconMoon, hours: "22:00–06:00" },
} as const

type ShiftKey = keyof typeof SHIFT_CONFIG

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------
function printHandover(data: HandoverData, notes: string, t: ReturnType<typeof useTranslations>) {
  const shiftLabel = t(data.shift as "early" | "late" | "night")
  const fmtDateStr = fmtDate(data.date)

  const changeTypeLabels: Record<string, string> = {
    in: t("changeTypes.in"),
    out: t("changeTypes.out"),
    transfer: t("changeTypes.transfer"),
    correction: t("changeTypes.correction"),
    inventory: t("changeTypes.inventory"),
  }

  const bookingTypeLabels: Record<string, string> = {
    checkout: t("bookingTypes.checkout"),
    checkin: t("bookingTypes.checkin"),
    transfer: t("bookingTypes.transfer"),
  }

  const commissionStatusLabels: Record<string, string> = {
    open: t("commissionStatuses.open"),
    in_progress: t("commissionStatuses.inProgress"),
    completed: t("commissionStatuses.completed"),
    cancelled: t("commissionStatuses.cancelled"),
  }

  const stockHtml =
    data.stockChanges.length > 0
      ? `<table>
          <thead><tr><th>${t("time")}</th><th>${t("type")}</th><th>${t("material")}</th><th>${t("location")}</th><th>${t("quantity")}</th><th>${t("user")}</th><th>${t("note")}</th></tr></thead>
          <tbody>${data.stockChanges
            .map(
              (c) =>
                `<tr><td>${fmtTime(c.createdAt)}</td><td>${changeTypeLabels[c.changeType] ?? c.changeType}</td><td>${c.materialName ?? "—"}${c.materialNumber ? ` <span class="sub">#${c.materialNumber}</span>` : ""}</td><td>${c.locationName ?? "—"}</td><td class="${c.quantity < 0 ? "red" : "green"}">${c.quantity > 0 ? "+" : ""}${c.quantity}</td><td>${c.userName ?? "—"}</td><td>${c.notes ?? ""}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : `<p>${t("noStockChanges")}</p>`

  const toolHtml =
    data.toolBookings.length > 0
      ? `<table>
          <thead><tr><th>${t("time")}</th><th>${t("type")}</th><th>${t("tool")}</th><th>${t("user")}</th><th>${t("note")}</th></tr></thead>
          <tbody>${data.toolBookings
            .map(
              (b) =>
                `<tr><td>${fmtTime(b.createdAt)}</td><td>${bookingTypeLabels[b.bookingType] ?? b.bookingType}</td><td>${b.toolName ?? "—"}${b.toolNumber ? ` <span class="sub">#${b.toolNumber}</span>` : ""}</td><td>${b.userName ?? "—"}</td><td>${b.notes ?? ""}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : `<p>${t("noToolBookings")}</p>`

  const commHtml =
    data.openCommissions.length > 0
      ? `<table>
          <thead><tr><th>${t("commission")}</th><th>${t("status")}</th><th>${t("updated")}</th></tr></thead>
          <tbody>${data.openCommissions
            .map(
              (c) =>
                `<tr><td>${c.manualNumber ?? (c.number ? `#${c.number}` : c.name)}</td><td>${commissionStatusLabels[c.status ?? ""] ?? c.status ?? "—"}</td><td>${fmtTime(c.updatedAt)}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : `<p>${t("noOpenCommissions")}</p>`

  const orderHtml =
    data.openOrders.length > 0
      ? `<table>
          <thead><tr><th>${t("orderNumber")}</th><th>${t("supplier")}</th><th>${t("orderDate")}</th><th>${t("amount")}</th></tr></thead>
          <tbody>${data.openOrders
            .map(
              (o) =>
                `<tr><td>${o.ownOrderNumber ?? o.orderNumber ?? "—"}</td><td>${o.supplierName ?? "—"}</td><td>${o.orderDate ? fmtDate(o.orderDate) : "—"}</td><td>${o.totalAmount != null ? `${(o.totalAmount / 100).toFixed(2)} ${o.currency ?? "CHF"}` : "—"}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : `<p>${t("noOpenOrders")}</p>`

  const notesHtml = notes.trim()
    ? `<div class="notes-box">${notes.replace(/\n/g, "<br/>")}</div>`
    : `<p>${t("noHints")}</p>`

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${t("printTitle")} ${fmtDateStr} — ${shiftLabel}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 0; }
    .report-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #111; }
    h1 { font-size: 16px; margin: 0; }
    h2 { font-size: 13px; margin: 14px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .report-date { font-size: 9px; color: #555; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 12px; }
    .summary-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; }
    .summary-item .label { display: block; font-size: 8px; color: #888; }
    .summary-item .value { font-size: 18px; font-weight: 700; }
    .summary-item .value.green { color: #16a34a; }
    .summary-item .value.red { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; }
    thead th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; font-weight: 600; white-space: nowrap; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody td { border: 1px solid #e2e8f0; padding: 3px 6px; vertical-align: top; }
    .sub { color: #999; font-size: 8px; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 10px; font-size: 10px; white-space: pre-wrap; }
    .report-footer { margin-top: 12px; font-size: 8px; color: #888; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${t("printTitle")} — ${fmtDateStr} — ${shiftLabel}</h1>
    <span class="report-date">${t("printCreatedAt")} ${new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
  </div>

  <div class="summary-grid">
    <div class="summary-item"><span class="label">${t("printStockMovements")}</span><span class="value">${data.summary.totalStockChanges}</span></div>
    <div class="summary-item"><span class="label">${t("printToolBookings")}</span><span class="value">${data.summary.checkoutCount + data.summary.checkinCount}</span></div>
    <div class="summary-item"><span class="label">${t("printOpenCommissions")}</span><span class="value">${data.summary.openCommissions}</span></div>
    <div class="summary-item"><span class="label">${t("printOpenOrders")}</span><span class="value">${data.summary.openOrders}</span></div>
  </div>

  <h2>${t("printStockChanges")}</h2>
  ${stockHtml}

  <h2>${t("printToolBookings")}</h2>
  ${toolHtml}

  <h2>${t("printOpenCommissions")}</h2>
  ${commHtml}

  <h2>${t("printOpenOrders")}</h2>
  ${orderHtml}

  <h2>${t("printNotes")}</h2>
  ${notesHtml}

  <div class="report-footer">${t("printTitle")} — LogistikApp — ${fmtDateStr} — ${shiftLabel}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=1100")
  if (!win) return
  win.document.write(html)
  win.document.close()
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ShiftHandoverPage() {
  const t = useTranslations("shiftHandover")
  const [date, setDate] = useState(today())
  const [shift, setShift] = useState<ShiftKey>("early")
  const [data, setData] = useState<HandoverData | null>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState<"fetch" | "print" | "email" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

  const fetchData = useCallback(async (): Promise<HandoverData> => {
    const params = new URLSearchParams({ date, shift })
    const res = await fetch(`/api/shift-handover?${params}`)
    if (!res.ok) throw new Error(t("fetchError"))
    return res.json() as Promise<HandoverData>
  }, [date, shift, t])

  const handleFetch = useCallback(async () => {
    setLoading("fetch")
    setError(null)
    setEmailSuccess(false)
    try {
      const result = await fetchData()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [fetchData, t])

  const handlePrint = useCallback(async () => {
    setLoading("print")
    setError(null)
    try {
      const result = data ?? (await fetchData())
      if (!data) setData(result)
      printHandover(result, notes, t)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [data, fetchData, notes, t])

  const handleEmail = useCallback(async () => {
    setLoading("email")
    setError(null)
    setEmailSuccess(false)
    try {
      const res = await fetch("/api/reports/shift/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, shift, notes }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(
          (json as { error?: string }).error ?? t("emailError")
        )
      }
      setEmailSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [date, shift, notes, t])

  const isBusy = loading !== null
  const ShiftIcon = SHIFT_CONFIG[shift].icon

  const commissionStatusBadge = useCallback(
    (status: string | null) => {
      const variant =
        status === "completed"
          ? "default"
          : status === "cancelled"
            ? "destructive"
            : "secondary"
      const statusKey = status === "in_progress" ? "inProgress" : (status ?? "")
      return (
        <Badge variant={variant} className="text-xs">
          {t.has(`commissionStatuses.${statusKey}` as Parameters<typeof t>[0]) ? t(`commissionStatuses.${statusKey}` as Parameters<typeof t>[0]) : status ?? "—"}
        </Badge>
      )
    },
    [t]
  )

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {t("sectionLabel")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconClipboardText className="size-6 text-primary" />
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShiftIcon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("selectShift")}</CardTitle>
              <CardDescription className="text-xs">
                {t("selectShiftDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t("dateLabel")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-40 text-xs"
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t("shiftLabel")}</Label>
              <Select
                value={shift}
                onValueChange={(v) => setShift(v as ShiftKey)}
                disabled={isBusy}
              >
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SHIFT_CONFIG) as [ShiftKey, typeof SHIFT_CONFIG.early][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <cfg.icon className="size-3.5" />
                          {t(key)}
                        </span>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleFetch}
              disabled={isBusy}
              className="h-8"
            >
              {loading === "fetch" ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconClockHour5 className="size-4" />
              )}
              {t("load")}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isBusy}
                className="h-8"
              >
                {loading === "print" ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconPrinter className="size-4" />
                )}
                {t("exportPdf")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmail}
                disabled={isBusy}
                className="h-8"
              >
                {loading === "email" ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconMail className="size-4" />
                )}
                {t("sendEmail")}
              </Button>
            </div>
          </div>
          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertCircle className="size-4" />
              {error}
            </p>
          )}
          {emailSuccess && (
            <p className="mt-3 text-sm text-green-600">
              {t("emailSuccess")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report content */}
      {data && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: t("stockChanges"),
                value: data.summary.totalStockChanges,
                icon: IconPackage,
                sub: `${data.summary.inCount} ${t("inCount")} / ${data.summary.outCount} ${t("outCount")}`,
              },
              {
                label: t("toolBookings"),
                value: data.summary.checkoutCount + data.summary.checkinCount,
                icon: IconTool,
                sub: `${data.summary.checkoutCount} ${t("checkoutCount")} / ${data.summary.checkinCount} ${t("checkinCount")}`,
              },
              {
                label: t("openCommissions"),
                value: data.summary.openCommissions,
                icon: IconClipboardList,
                sub: t("openInProgress"),
              },
              {
                label: t("openOrders"),
                value: data.summary.openOrders,
                icon: IconFileInvoice,
                sub: t("statusOrdered"),
              },
            ].map(({ label, value, icon: Icon, sub }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Stock Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconPackage className="size-4 text-primary" />
                {t("stockChanges")} ({data.summary.totalStockChanges})
              </CardTitle>
              <CardDescription className="text-xs">
                {t("stockChangesDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.stockChanges.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {t("noStockChanges")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">{t("time")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("type")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("material")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("location")}</th>
                        <th className="px-4 py-2 text-right font-medium">{t("quantity")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("user")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("note")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.stockChanges.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums text-muted-foreground">
                            {fmtTime(c.createdAt)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-1.5">
                              {changeTypeIcon(c.changeType)}
                              {t.has(`changeTypes.${c.changeType}` as Parameters<typeof t>[0]) ? t(`changeTypes.${c.changeType}` as Parameters<typeof t>[0]) : c.changeType}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {c.materialName ?? "—"}
                            {c.materialNumber && (
                              <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                #{c.materialNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {c.locationName ?? "—"}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono font-medium ${c.quantity < 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {c.quantity > 0 ? "+" : ""}
                            {c.quantity}
                          </td>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-1.5">
                              <IconUser className="size-3.5 text-muted-foreground" />
                              {c.userName ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {c.notes ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tool Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconTool className="size-4 text-primary" />
                {t("toolBookings")} (
                {data.summary.checkoutCount + data.summary.checkinCount})
              </CardTitle>
              <CardDescription className="text-xs">
                {t("toolBookingsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.toolBookings.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {t("noToolBookings")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">{t("time")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("type")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("tool")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("user")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("note")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.toolBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums text-muted-foreground">
                            {fmtTime(b.createdAt)}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={
                                b.bookingType === "checkout"
                                  ? "destructive"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {t.has(`bookingTypes.${b.bookingType}` as Parameters<typeof t>[0]) ? t(`bookingTypes.${b.bookingType}` as Parameters<typeof t>[0]) : b.bookingType}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            {b.toolName ?? "—"}
                            {b.toolNumber && (
                              <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                #{b.toolNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-1.5">
                              <IconUser className="size-3.5 text-muted-foreground" />
                              {b.userName ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {b.notes ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Commissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconClipboardList className="size-4 text-primary" />
                {t("openCommissions")} ({data.openCommissions.length})
              </CardTitle>
              <CardDescription className="text-xs">
                {t("openCommissionsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.openCommissions.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {t("noOpenCommissions")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">{t("commission")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("status")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("updated")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.openCommissions.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">
                            {c.manualNumber ??
                              (c.number ? `#${c.number}` : c.name)}
                          </td>
                          <td className="px-4 py-2">
                            {commissionStatusBadge(c.status)}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {fmtTime(c.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconFileInvoice className="size-4 text-primary" />
                {t("openOrders")} ({data.openOrders.length})
              </CardTitle>
              <CardDescription className="text-xs">
                {t("openOrdersDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.openOrders.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {t("noOpenOrders")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">{t("orderNumber")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("supplier")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("orderDate")}</th>
                        <th className="px-4 py-2 text-right font-medium">{t("amount")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("note")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.openOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium font-mono">
                            {o.ownOrderNumber ?? o.orderNumber ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            {o.supplierName ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {o.orderDate ? fmtDate(o.orderDate) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {o.totalAmount != null
                              ? `${(o.totalAmount / 100).toFixed(2)} ${o.currency ?? "CHF"}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {o.notes ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hinweise (free-text notes) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconNotes className="size-4 text-primary" />
                {t("notesTitle")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("notesDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="resize-y"
              />
            </CardContent>
          </Card>

          {/* Empty state */}
          {data.summary.totalStockChanges === 0 &&
            data.toolBookings.length === 0 &&
            data.openCommissions.length === 0 &&
            data.openOrders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noActivities")}
                  </p>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  )
}
