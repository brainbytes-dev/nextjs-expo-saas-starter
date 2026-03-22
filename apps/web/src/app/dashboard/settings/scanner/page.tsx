"use client"

import { useTranslations } from "next-intl"

import { useEffect, useState } from "react"
import { useScannerSettings } from "@/components/barcode-scanner-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  IconBarcode,
  IconVolume,
  IconSearch,
  IconCheck,
  IconDeviceDesktop,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Scanner settings page — /dashboard/settings/scanner
// ---------------------------------------------------------------------------
export default function ScannerSettingsPage() {
  const ts = useTranslations("settings")
  const {
    enabled,
    soundEnabled,
    autoLookup,
    setEnabled,
    setSoundEnabled,
    setAutoLookup,
    lastScan,
  } = useScannerSettings()

  // ── Test area state ─────────────────────────────────────────────────────
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const barcode = (e as CustomEvent).detail?.barcode
      if (barcode) {
        setTestResult(barcode)
      }
    }
    window.addEventListener("barcode-scanned", handler)
    return () => window.removeEventListener("barcode-scanned", handler)
  }, [])

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {ts("scannerTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {ts("scannerSubtitle")}
        </p>
      </div>

      {/* ── Allgemeine Einstellungen ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBarcode className="size-5" />
            {ts("scannerDetection")}
          </CardTitle>
          <CardDescription>
            {ts("scannerDetectionDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle: Enabled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="scanner-enabled"
                className="text-base font-medium"
              >
                {ts("scannerEnabled")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {ts("scannerEnabledDesc")}
              </p>
            </div>
            <Switch
              id="scanner-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <Separator />

          {/* Toggle: Sound */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="scanner-sound"
                className="flex items-center gap-2 text-base font-medium"
              >
                <IconVolume className="size-4 text-muted-foreground" />
                {ts("scannerSound")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {ts("scannerSoundDesc")}
              </p>
            </div>
            <Switch
              id="scanner-sound"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              disabled={!enabled}
            />
          </div>

          <Separator />

          {/* Toggle: Auto-Lookup */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="scanner-lookup"
                className="flex items-center gap-2 text-base font-medium"
              >
                <IconSearch className="size-4 text-muted-foreground" />
                {ts("scannerAutoLookup")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {ts("scannerAutoLookupDesc")}
              </p>
            </div>
            <Switch
              id="scanner-lookup"
              checked={autoLookup}
              onCheckedChange={setAutoLookup}
              disabled={!enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Testbereich ── */}
      <Card>
        <CardHeader>
          <CardTitle>{ts("testScanner")}</CardTitle>
          <CardDescription>
            {ts("testScannerDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            {testResult ? (
              <div className="space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-500/10">
                  <IconCheck className="size-6 text-green-600" />
                </div>
                <p className="text-lg font-semibold">{ts("scanDetected")}</p>
                <p className="font-mono text-2xl tracking-wider">
                  {testResult}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestResult(null)}
                >
                  Zurücksetzen
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                  <IconBarcode className="size-6 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">
                  {ts("scanBarcodePlease")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? ts("scannerReady")
                    : ts("scannerDisabled")}
                </p>
              </div>
            )}
          </div>

          {lastScan && !testResult && (
            <p className="mt-4 text-sm text-muted-foreground">
              {ts("lastScan")}{" "}
              <span className="font-mono font-medium">{lastScan}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Kompatible Scanner ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconDeviceDesktop className="size-5" />
            Kompatible Scanner
          </CardTitle>
          <CardDescription>
            {ts("compatibleScannersDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                brand: "Zebra",
                desc: "DS2208, DS3608, LI4278 und weitere",
              },
              {
                brand: "Honeywell",
                desc: "Voyager 1200g, Granit 1981i+",
              },
              {
                brand: "Datalogic",
                desc: "QuickScan QD2500, Gryphon GD4500+",
              },
              {
                brand: "Symbol / Motorola",
                desc: "LS2208, DS4308 und weitere",
              },
            ].map((s) => (
              <div
                key={s.brand}
                className="rounded-lg border bg-muted/30 p-4"
              >
                <p className="font-medium">{s.brand}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Hinweis
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ts("scannerNoteText")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
