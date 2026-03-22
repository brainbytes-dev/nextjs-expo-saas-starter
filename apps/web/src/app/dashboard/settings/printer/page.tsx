"use client"

import { useTranslations } from "next-intl"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconPrinter,
  IconUsb,
  IconWifi,
  IconBluetooth,
  IconCheck,
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react"
import {
  type PrinterType,
  type ConnectionType,
  type LabelSize,
  type PrinterSettings,
  loadPrinterSettings,
  savePrinterSettings,
  generateZPL,
  printLabel,
} from "@/lib/label-printer"

// ---------------------------------------------------------------------------
// Printer settings page — /dashboard/settings/printer
// ---------------------------------------------------------------------------
export default function PrinterSettingsPage() {
  const ts = useTranslations("settings")
  const [settings, setSettings] = useState<PrinterSettings>(loadPrinterSettings)
  const [testStatus, setTestStatus] = useState<"idle" | "printing" | "success" | "error">("idle")
  const [testError, setTestError] = useState<string | null>(null)

  // Persist settings whenever they change
  useEffect(() => {
    savePrinterSettings(settings)
  }, [settings])

  const updateSettings = useCallback(
    <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // ── Test print ──────────────────────────────────────────────────────────
  const handleTestPrint = useCallback(async () => {
    setTestStatus("printing")
    setTestError(null)
    try {
      await printLabel(
        {
          type: "barcode",
          name: "LogistikApp Testdruck",
          number: "TEST-001",
          barcode: "1234567890128",
          orgName: "LogistikApp",
          date: new Date().toLocaleDateString("de-CH"),
        },
        settings
      )
      setTestStatus("success")
      setTimeout(() => setTestStatus("idle"), 3000)
    } catch (err: unknown) {
      setTestStatus("error")
      setTestError(err instanceof Error ? err.message : ts("unknownError"))
    }
  }, [settings])

  // ── ZPL Preview ─────────────────────────────────────────────────────────
  const previewZPL = generateZPL(
    {
      type: "material",
      name: "Sample Material",
      number: "MAT-12345",
      barcode: "1234567890128",
      orgName: "My Company AG",
    },
    settings.labelSize
  )

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {ts("printerTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {ts("printerSubtitle")}
        </p>
      </div>

      {/* ── Druckertyp ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconPrinter className="size-5" />
            Druckertyp
          </CardTitle>
          <CardDescription>
            {ts("printerTypeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {PRINTER_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => updateSettings("printerType", pt.value)}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  settings.printerType === pt.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <p className="font-semibold">{pt.label}</p>
                <p className="text-sm text-muted-foreground">{pt.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Verbindung ── */}
      <Card>
        <CardHeader>
          <CardTitle>{ts("connection")}</CardTitle>
          <CardDescription>
            {ts("connectionDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {CONNECTION_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => updateSettings("connection", ct.value)}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  settings.connection === ct.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <ct.icon className="size-5 shrink-0" />
                <div>
                  <p className="font-semibold">{ct.label}</p>
                  <p className="text-xs text-muted-foreground">{ct.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Network settings */}
          {settings.connection === "network" && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="network-ip">{ts("ipAddress")}</Label>
                  <Input
                    id="network-ip"
                    placeholder="192.168.1.100"
                    value={settings.networkIp || ""}
                    onChange={(e) => updateSettings("networkIp", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="network-port">{ts("port")}</Label>
                  <Input
                    id="network-port"
                    type="number"
                    placeholder="9100"
                    value={settings.networkPort || 9100}
                    onChange={(e) =>
                      updateSettings("networkPort", parseInt(e.target.value, 10) || 9100)
                    }
                  />
                </div>
              </div>
            </>
          )}

          {/* Browser compatibility notice — only show on non-Chromium browsers */}
          {(settings.connection === "usb" || settings.connection === "bluetooth") && typeof navigator !== "undefined" && !(/Chrome/.test(navigator.userAgent)) && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-2">
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {ts("browserCompat")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {settings.connection === "usb"
                      ? ts("webUsbNotice")
                      : ts("webBluetoothNotice")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Etikettengrösse ── */}
      <Card>
        <CardHeader>
          <CardTitle>{ts("labelSize")}</CardTitle>
          <CardDescription>
            {ts("labelSizeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.labelSize}
            onValueChange={(val) => updateSettings("labelSize", val as LabelSize)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_SIZES.map((ls) => (
                <SelectItem key={ls.value} value={ls.value}>
                  {ls.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── Testdruck ── */}
      <Card>
        <CardHeader>
          <CardTitle>{ts("testPrint")}</CardTitle>
          <CardDescription>
            {ts("testPrintDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ZPL Preview */}
          <div>
            <Label className="text-sm font-medium">{ts("zplPreview")}</Label>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs">
              {previewZPL}
            </pre>
          </div>

          <Separator />

          <div className="flex items-center gap-4">
            <Button
              onClick={handleTestPrint}
              disabled={testStatus === "printing"}
            >
              {testStatus === "printing" ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  {ts("printing")}
                </>
              ) : (
                <>
                  <IconPrinter className="mr-2 size-4" />
                  {ts("printTestLabel")}
                </>
              )}
            </Button>

            {testStatus === "success" && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <IconCheck className="size-4" />
                {ts("printSuccess")}
              </span>
            )}

            {testStatus === "error" && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <IconAlertTriangle className="size-4" />
                {testError}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Druckerstatus ── */}
      <Card>
        <CardHeader>
          <CardTitle>{ts("printerStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex size-3 items-center justify-center">
              <span className="size-2.5 rounded-full bg-muted-foreground/40" />
            </div>
            <span className="text-sm text-muted-foreground">
              {ts("noPrinterConnected")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRINTER_TYPES: { value: PrinterType; label: string; desc: string }[] = [
  { value: "zebra", label: "Zebra (ZPL)", desc: "ZD420, ZD621, GK420+" },
  { value: "brother", label: "Brother QL", desc: "QL-820NWB, QL-1110NWB+" },
  { value: "generic", label: "Generic (ZPL)", desc: "ZPL-compatible" },
]

const CONNECTION_TYPES: {
  value: ConnectionType
  label: string
  desc: string
  icon: typeof IconUsb
}[] = [
  { value: "usb", label: "USB", desc: "USB", icon: IconUsb },
  { value: "network", label: "Network", desc: "IP", icon: IconWifi },
  { value: "bluetooth", label: "Bluetooth", desc: "BLE", icon: IconBluetooth },
]

const LABEL_SIZES: { value: LabelSize; label: string }[] = [
  { value: "50x25", label: "50 x 25 mm" },
  { value: "100x50", label: "100 x 50 mm" },
  { value: "100x150", label: "100 x 150 mm" },
]
