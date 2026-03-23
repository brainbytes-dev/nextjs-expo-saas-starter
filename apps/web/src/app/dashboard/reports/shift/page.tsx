"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconClockHour5,
  IconLoader2,
  IconPrinter,
  IconMail,
  IconPackage,
  IconTool,
  IconClipboardList,
  IconArrowUp,
  IconArrowDown,
  IconArrowsTransferDown,
  IconAdjustments,
  IconUser,
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

// ---------------------------------------------------------------------------
// Types matching the API response
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

interface Summary {
  totalStockChanges: number
  inCount: number
  outCount: number
  transferCount: number
  correctionCount: number
  checkoutCount: number
  checkinCount: number
  commissionsUpdated: number
}

interface StockUserGroup {
  userId: string
  userName: string
  changes: StockChangeRow[]
}

interface ToolUserGroup {
  userId: string
  userName: string
  bookings: ToolBookingRow[]
}

interface ShiftReport {
  date: string
  summary: Summary
  stockChangesByUser: StockUserGroup[]
  toolBookingsByUser: ToolUserGroup[]
  commissions: CommissionRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function fmtTime(d: string): string {
  return new Date(d).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
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

// ---------------------------------------------------------------------------
// Print the shift report (opens a new window and calls window.print())
// ---------------------------------------------------------------------------
function printShiftReport(report: ShiftReport, t: (key: string) => string) {
  const fmtDateStr = fmtDate(report.date)

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

  // Build HTML sections
  const summaryHtml = `
    <div class="summary-grid">
      <div class="summary-item"><span class="label">${t("stockMovements")}</span><span class="value">${report.summary.totalStockChanges}</span></div>
      <div class="summary-item"><span class="label">${t("receipts")}</span><span class="value green">${report.summary.inCount}</span></div>
      <div class="summary-item"><span class="label">${t("issues")}</span><span class="value red">${report.summary.outCount}</span></div>
      <div class="summary-item"><span class="label">${t("transfers")}</span><span class="value">${report.summary.transferCount}</span></div>
      <div class="summary-item"><span class="label">${t("corrections")}</span><span class="value">${report.summary.correctionCount}</span></div>
      <div class="summary-item"><span class="label">${t("toolCheckouts")}</span><span class="value">${report.summary.checkoutCount}</span></div>
      <div class="summary-item"><span class="label">${t("toolCheckins")}</span><span class="value">${report.summary.checkinCount}</span></div>
      <div class="summary-item"><span class="label">${t("commissionsLabel")}</span><span class="value">${report.summary.commissionsUpdated}</span></div>
    </div>`

  const stockSections = report.stockChangesByUser
    .map(
      (ug) => `
      <h3 class="user-heading">${ug.userName}</h3>
      <table>
        <thead><tr>
          <th>${t("thTime")}</th><th>${t("thType")}</th><th>${t("thMaterial")}</th><th>${t("thLocation")}</th><th>${t("thQuantity")}</th><th>${t("thNote")}</th>
        </tr></thead>
        <tbody>
          ${ug.changes
            .map(
              (c) => `<tr>
            <td>${fmtTime(c.createdAt)}</td>
            <td>${changeTypeLabels[c.changeType] ?? c.changeType}</td>
            <td>${c.materialName ?? "—"}${c.materialNumber ? ` <span class="sub">#${c.materialNumber}</span>` : ""}</td>
            <td>${c.locationName ?? "—"}</td>
            <td class="${c.quantity < 0 ? "red" : "green"}">${c.quantity > 0 ? "+" : ""}${c.quantity}</td>
            <td>${c.notes ?? ""}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>`,
    )
    .join("")

  const toolSections = report.toolBookingsByUser
    .map(
      (ug) => `
      <h3 class="user-heading">${ug.userName}</h3>
      <table>
        <thead><tr>
          <th>${t("thTime")}</th><th>${t("thType")}</th><th>${t("thTool")}</th><th>${t("thNote")}</th>
        </tr></thead>
        <tbody>
          ${ug.bookings
            .map(
              (b) => `<tr>
            <td>${fmtTime(b.createdAt)}</td>
            <td>${bookingTypeLabels[b.bookingType] ?? b.bookingType}</td>
            <td>${b.toolName ?? "—"}${b.toolNumber ? ` <span class="sub">#${b.toolNumber}</span>` : ""}</td>
            <td>${b.notes ?? ""}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>`,
    )
    .join("")

  const commissionSection =
    report.commissions.length > 0
      ? `<table>
          <thead><tr><th>${t("thCommission")}</th><th>${t("thStatus")}</th><th>${t("thModified")}</th></tr></thead>
          <tbody>
            ${report.commissions
              .map(
                (c) => `<tr>
              <td>${c.manualNumber ?? (c.number ? `#${c.number}` : c.name)}</td>
              <td>${commissionStatusLabels[c.status ?? ""] ?? c.status ?? "—"}</td>
              <td>${fmtTime(c.updatedAt)}</td>
            </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<p>${t("noCommissionActivity")}</p>`

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${t("printReportTitle")} ${fmtDateStr}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 0; }
    .report-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #111; }
    h1 { font-size: 16px; margin: 0; }
    h2 { font-size: 13px; margin: 14px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h3.user-heading { font-size: 11px; margin: 8px 0 4px; color: #555; }
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
    .report-footer { margin-top: 12px; font-size: 8px; color: #888; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${t("printReportTitle")} &mdash; ${fmtDateStr}</h1>
    <span class="report-date">${t("printCreatedAt")} ${new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
  </div>

  <h2>${t("summary")}</h2>
  ${summaryHtml}

  ${report.stockChangesByUser.length > 0 ? `<h2>${t("stockMovements")}</h2>${stockSections}` : ""}
  ${report.toolBookingsByUser.length > 0 ? `<h2>${t("toolBookingsTitle")}</h2>${toolSections}` : ""}
  <h2>${t("commissionsLabel")}</h2>
  ${commissionSection}

  <div class="report-footer">${t("printReportTitle")} &mdash; Zentory &mdash; ${fmtDateStr}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=1100")
  if (!win) return
  win.document.write(html)
  win.document.close()
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ShiftReportPage() {
  const t = useTranslations("shiftReport")
  const [date, setDate] = useState(today())
  const [report, setReport] = useState<ShiftReport | null>(null)
  const [loading, setLoading] = useState<"fetch" | "print" | "email" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

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

  function commissionStatusBadge(status: string | null) {
    const variant =
      status === "completed"
        ? "default"
        : status === "cancelled"
          ? "destructive"
          : "secondary"
    return (
      <Badge variant={variant} className="text-xs">
        {commissionStatusLabels[status ?? ""] ?? status ?? "—"}
      </Badge>
    )
  }

  const fetchReport = useCallback(async (): Promise<ShiftReport> => {
    const params = new URLSearchParams({ date })
    const res = await fetch(`/api/reports/shift?${params}`)
    if (!res.ok) throw new Error(t("fetchError"))
    return res.json() as Promise<ShiftReport>
  }, [date, t])

  const handleFetch = useCallback(async () => {
    setLoading("fetch")
    setError(null)
    setEmailSuccess(false)
    try {
      const data = await fetchReport()
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [fetchReport, t])

  const handlePrint = useCallback(async () => {
    setLoading("print")
    setError(null)
    try {
      const data = report ?? (await fetchReport())
      if (!report) setReport(data)
      printShiftReport(data, t)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [report, fetchReport, t])

  const handleEmail = useCallback(async () => {
    setLoading("email")
    setError(null)
    setEmailSuccess(false)
    try {
      const res = await fetch("/api/reports/shift/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? t("emailSendError"))
      }
      setEmailSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [date, t])

  const isBusy = loading !== null

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
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
              <IconClockHour5 className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("shiftDate")}</CardTitle>
              <CardDescription className="text-xs">
                {t("autoEmailNote")}
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
              {t("generateReport")}
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
                {t("printPdf")}
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
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {emailSuccess && (
            <p className="mt-3 text-sm text-green-600">
              {t("emailSuccess")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report content */}
      {report && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: t("stockMovements"),
                value: report.summary.totalStockChanges,
                icon: IconPackage,
                sub: `${report.summary.inCount} ${t("inLabel")} / ${report.summary.outCount} ${t("outLabel")}`,
              },
              {
                label: t("correctionsTransfers"),
                value: report.summary.correctionCount + report.summary.transferCount,
                icon: IconAdjustments,
                sub: `${report.summary.transferCount} ${t("transfers")}`,
              },
              {
                label: t("toolBookings"),
                value: report.summary.checkoutCount + report.summary.checkinCount,
                icon: IconTool,
                sub: `${report.summary.checkoutCount} ${t("outLabel")} / ${report.summary.checkinCount} ${t("returnLabel")}`,
              },
              {
                label: t("commissionsLabel"),
                value: report.summary.commissionsUpdated,
                icon: IconClipboardList,
                sub: t("updatedLabel"),
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

          {/* Stock changes by user */}
          {report.stockChangesByUser.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("stockChangesTitle")} ({report.summary.totalStockChanges})
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("stockChangesDesc", { date: fmtDate(report.date) })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {report.stockChangesByUser.map((ug) => (
                  <div key={ug.userId}>
                    <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-2">
                      <IconUser className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{ug.userName}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {ug.changes.length} {t("bookings")}
                      </Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="px-4 py-2 text-left font-medium">{t("thTime")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thType")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thMaterial")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thLocation")}</th>
                            <th className="px-4 py-2 text-right font-medium">{t("thQuantity")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thNote")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {ug.changes.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/30">
                              <td className="px-4 py-2 tabular-nums text-muted-foreground">
                                {fmtTime(c.createdAt)}
                              </td>
                              <td className="px-4 py-2">
                                <span className="flex items-center gap-1.5">
                                  {changeTypeIcon(c.changeType)}
                                  {changeTypeLabels[c.changeType] ?? c.changeType}
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
                              <td className="px-4 py-2 text-muted-foreground">
                                {c.notes ?? ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tool bookings by user */}
          {report.toolBookingsByUser.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("toolBookingsTitle")} (
                  {report.summary.checkoutCount + report.summary.checkinCount})
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("toolBookingsDesc", { date: fmtDate(report.date) })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {report.toolBookingsByUser.map((ug) => (
                  <div key={ug.userId}>
                    <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-2">
                      <IconUser className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{ug.userName}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {ug.bookings.length} {t("bookings")}
                      </Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="px-4 py-2 text-left font-medium">{t("thTime")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thType")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thTool")}</th>
                            <th className="px-4 py-2 text-left font-medium">{t("thNote")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {ug.bookings.map((b) => (
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
                                  {bookingTypeLabels[b.bookingType] ?? b.bookingType}
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
                              <td className="px-4 py-2 text-muted-foreground">
                                {b.notes ?? ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Commissions */}
          {report.commissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("commissionsTitle")} ({report.commissions.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("commissionsDesc", { date: fmtDate(report.date) })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">{t("thCommission")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("thStatus")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("thModified")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.commissions.map((c) => (
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
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {report.summary.totalStockChanges === 0 &&
            report.toolBookingsByUser.length === 0 &&
            report.commissions.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noActivities", { date: fmtDate(report.date) })}
                  </p>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  )
}
