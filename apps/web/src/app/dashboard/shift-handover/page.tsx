"use client"

import { useState, useCallback } from "react"
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

const changeTypeLabels: Record<string, string> = {
  in: "Eingang",
  out: "Ausgang",
  transfer: "Transfer",
  correction: "Korrektur",
  inventory: "Inventur",
}

const bookingTypeLabels: Record<string, string> = {
  checkout: "Ausgabe",
  checkin: "Rückgabe",
  transfer: "Transfer",
}

const commissionStatusLabels: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
}

const SHIFT_CONFIG = {
  early: { label: "Frühschicht (06–14)", icon: IconSun, hours: "06:00–14:00" },
  late: { label: "Spätschicht (14–22)", icon: IconSunset2, hours: "14:00–22:00" },
  night: { label: "Nachtschicht (22–06)", icon: IconMoon, hours: "22:00–06:00" },
} as const

type ShiftKey = keyof typeof SHIFT_CONFIG

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

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------
function printHandover(data: HandoverData, notes: string) {
  const shiftCfg = SHIFT_CONFIG[data.shift as ShiftKey] ?? SHIFT_CONFIG.early
  const fmtDateStr = fmtDate(data.date)

  const stockHtml =
    data.stockChanges.length > 0
      ? `<table>
          <thead><tr><th>Zeit</th><th>Typ</th><th>Material</th><th>Lagerort</th><th>Menge</th><th>Benutzer</th><th>Notiz</th></tr></thead>
          <tbody>${data.stockChanges
            .map(
              (c) =>
                `<tr><td>${fmtTime(c.createdAt)}</td><td>${changeTypeLabels[c.changeType] ?? c.changeType}</td><td>${c.materialName ?? "—"}${c.materialNumber ? ` <span class="sub">#${c.materialNumber}</span>` : ""}</td><td>${c.locationName ?? "—"}</td><td class="${c.quantity < 0 ? "red" : "green"}">${c.quantity > 0 ? "+" : ""}${c.quantity}</td><td>${c.userName ?? "—"}</td><td>${c.notes ?? ""}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : "<p>Keine Bestandsänderungen in dieser Schicht.</p>"

  const toolHtml =
    data.toolBookings.length > 0
      ? `<table>
          <thead><tr><th>Zeit</th><th>Typ</th><th>Werkzeug</th><th>Benutzer</th><th>Notiz</th></tr></thead>
          <tbody>${data.toolBookings
            .map(
              (b) =>
                `<tr><td>${fmtTime(b.createdAt)}</td><td>${bookingTypeLabels[b.bookingType] ?? b.bookingType}</td><td>${b.toolName ?? "—"}${b.toolNumber ? ` <span class="sub">#${b.toolNumber}</span>` : ""}</td><td>${b.userName ?? "—"}</td><td>${b.notes ?? ""}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : "<p>Keine Werkzeugbuchungen in dieser Schicht.</p>"

  const commHtml =
    data.openCommissions.length > 0
      ? `<table>
          <thead><tr><th>Kommission</th><th>Status</th><th>Aktualisiert</th></tr></thead>
          <tbody>${data.openCommissions
            .map(
              (c) =>
                `<tr><td>${c.manualNumber ?? (c.number ? `#${c.number}` : c.name)}</td><td>${commissionStatusLabels[c.status ?? ""] ?? c.status ?? "—"}</td><td>${fmtTime(c.updatedAt)}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : "<p>Keine offenen Kommissionen.</p>"

  const orderHtml =
    data.openOrders.length > 0
      ? `<table>
          <thead><tr><th>Bestellnr.</th><th>Lieferant</th><th>Bestelldatum</th><th>Betrag</th></tr></thead>
          <tbody>${data.openOrders
            .map(
              (o) =>
                `<tr><td>${o.ownOrderNumber ?? o.orderNumber ?? "—"}</td><td>${o.supplierName ?? "—"}</td><td>${o.orderDate ? fmtDate(o.orderDate) : "—"}</td><td>${o.totalAmount != null ? `${(o.totalAmount / 100).toFixed(2)} ${o.currency ?? "CHF"}` : "—"}</td></tr>`
            )
            .join("")}</tbody>
        </table>`
      : "<p>Keine offenen Bestellungen.</p>"

  const notesHtml = notes.trim()
    ? `<div class="notes-box">${notes.replace(/\n/g, "<br/>")}</div>`
    : "<p>Keine Hinweise.</p>"

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Schichtübergabe ${fmtDateStr} — ${shiftCfg.label}</title>
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
    <h1>Schichtübergabe — ${fmtDateStr} — ${shiftCfg.label}</h1>
    <span class="report-date">Erstellt am ${new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
  </div>

  <div class="summary-grid">
    <div class="summary-item"><span class="label">Lagerbewegungen</span><span class="value">${data.summary.totalStockChanges}</span></div>
    <div class="summary-item"><span class="label">Werkzeugbuchungen</span><span class="value">${data.summary.checkoutCount + data.summary.checkinCount}</span></div>
    <div class="summary-item"><span class="label">Offene Kommissionen</span><span class="value">${data.summary.openCommissions}</span></div>
    <div class="summary-item"><span class="label">Offene Bestellungen</span><span class="value">${data.summary.openOrders}</span></div>
  </div>

  <h2>Bestandsänderungen</h2>
  ${stockHtml}

  <h2>Werkzeugbuchungen</h2>
  ${toolHtml}

  <h2>Offene Kommissionen</h2>
  ${commHtml}

  <h2>Offene Bestellungen</h2>
  ${orderHtml}

  <h2>Hinweise</h2>
  ${notesHtml}

  <div class="report-footer">Schichtübergabe — LogistikApp — ${fmtDateStr} — ${shiftCfg.label}</div>
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
    if (!res.ok) throw new Error("Fehler beim Laden der Schichtübergabe-Daten")
    return res.json() as Promise<HandoverData>
  }, [date, shift])

  const handleFetch = useCallback(async () => {
    setLoading("fetch")
    setError(null)
    setEmailSuccess(false)
    try {
      const result = await fetchData()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
    } finally {
      setLoading(null)
    }
  }, [fetchData])

  const handlePrint = useCallback(async () => {
    setLoading("print")
    setError(null)
    try {
      const result = data ?? (await fetchData())
      if (!data) setData(result)
      printHandover(result, notes)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
    } finally {
      setLoading(null)
    }
  }, [data, fetchData, notes])

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
          (json as { error?: string }).error ?? "E-Mail-Versand fehlgeschlagen"
        )
      }
      setEmailSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
    } finally {
      setLoading(null)
    }
  }, [date, shift, notes])

  const isBusy = loading !== null
  const ShiftIcon = SHIFT_CONFIG[shift].icon

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Betrieb
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconClipboardText className="size-6 text-primary" />
          Schichtübergabe
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zusammenfassung aller Aktivitäten einer Schicht zur Übergabe an das
          nächste Team.
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
              <CardTitle className="text-base">Schicht auswählen</CardTitle>
              <CardDescription className="text-xs">
                Wählen Sie Datum und Schichtzeit für die Übergabe.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-40 text-xs"
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Schicht</Label>
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
                          {cfg.label}
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
              Laden
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
                Als PDF exportieren
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
                Per E-Mail senden
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
              Schichtübergabe wurde erfolgreich per E-Mail versandt.
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
                label: "Bestandsänderungen",
                value: data.summary.totalStockChanges,
                icon: IconPackage,
                sub: `${data.summary.inCount} Ein / ${data.summary.outCount} Aus`,
              },
              {
                label: "Werkzeugbuchungen",
                value: data.summary.checkoutCount + data.summary.checkinCount,
                icon: IconTool,
                sub: `${data.summary.checkoutCount} Aus / ${data.summary.checkinCount} Zurück`,
              },
              {
                label: "Offene Kommissionen",
                value: data.summary.openCommissions,
                icon: IconClipboardList,
                sub: "offen / in Bearbeitung",
              },
              {
                label: "Offene Bestellungen",
                value: data.summary.openOrders,
                icon: IconFileInvoice,
                sub: "Status: bestellt",
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
                Bestandsänderungen heute ({data.summary.totalStockChanges})
              </CardTitle>
              <CardDescription className="text-xs">
                Alle Ein-/Ausgänge, Transfers und Korrekturen während der
                Schicht.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.stockChanges.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Keine Bestandsänderungen in dieser Schicht.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">
                          Zeit
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Typ
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Material
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Lagerort
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Menge
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Benutzer
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Notiz
                        </th>
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
                Werkzeugbuchungen heute (
                {data.summary.checkoutCount + data.summary.checkinCount})
              </CardTitle>
              <CardDescription className="text-xs">
                Ausgaben und Rückgaben während der Schicht.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.toolBookings.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Keine Werkzeugbuchungen in dieser Schicht.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">
                          Zeit
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Typ
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Werkzeug
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Benutzer
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Notiz
                        </th>
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
                              {bookingTypeLabels[b.bookingType] ??
                                b.bookingType}
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
                Offene Kommissionen ({data.openCommissions.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Kommissionen mit Status &quot;Offen&quot; oder &quot;In
                Bearbeitung&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.openCommissions.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Keine offenen Kommissionen.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">
                          Kommission
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Aktualisiert
                        </th>
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
                Offene Bestellungen ({data.openOrders.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Bestellungen mit Status &quot;Bestellt&quot; — noch nicht
                eingegangen.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.openOrders.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  Keine offenen Bestellungen.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">
                          Bestellnr.
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Lieferant
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Bestelldatum
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Betrag
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Notiz
                        </th>
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
                Hinweise
              </CardTitle>
              <CardDescription className="text-xs">
                Freitextfeld für die Übergabe an die nächste Schicht. Wird beim
                PDF-Export und E-Mail-Versand mitgesendet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Besondere Vorkommnisse, offene Aufgaben, Hinweise für die nächste Schicht..."
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
                    Keine Aktivitäten in der gewählten Schicht gefunden.
                  </p>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  )
}
