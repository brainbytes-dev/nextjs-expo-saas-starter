"use client"

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
          Handscanner-Einstellungen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Konfigurieren Sie die Erkennung von Hardware-Barcode-Scannern im
          Keyboard-Wedge-Modus.
        </p>
      </div>

      {/* ── Allgemeine Einstellungen ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBarcode className="size-5" />
            Scanner-Erkennung
          </CardTitle>
          <CardDescription>
            Steuern Sie, wie LogistikApp auf Barcode-Scanner-Eingaben reagiert.
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
                Scanner-Erkennung aktiviert
              </Label>
              <p className="text-sm text-muted-foreground">
                Schnelle Tastatureingaben werden automatisch als Barcode-Scan
                erkannt.
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
                Piepton bei Scan
              </Label>
              <p className="text-sm text-muted-foreground">
                Ein kurzer Bestätigungston wird bei jedem erkannten Scan
                abgespielt.
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
                Produkt automatisch nachschlagen
              </Label>
              <p className="text-sm text-muted-foreground">
                Nach dem Scan wird der Barcode automatisch in der Datenbank
                gesucht.
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
          <CardTitle>Scanner testen</CardTitle>
          <CardDescription>
            Scannen Sie einen Barcode, um die Erkennung zu testen. Klicken Sie
            nicht in ein Eingabefeld — der Scanner wird nur erkannt, wenn kein
            Textfeld fokussiert ist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            {testResult ? (
              <div className="space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-500/10">
                  <IconCheck className="size-6 text-green-600" />
                </div>
                <p className="text-lg font-semibold">Scan erkannt!</p>
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
                  Scannen Sie einen Barcode zum Testen
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? "Bereit — Scanner-Erkennung ist aktiv."
                    : "Scanner-Erkennung ist deaktiviert. Aktivieren Sie sie oben."}
                </p>
              </div>
            )}
          </div>

          {lastScan && !testResult && (
            <p className="mt-4 text-sm text-muted-foreground">
              Letzter Scan:{" "}
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
            LogistikApp unterstützt alle gängigen USB- und Bluetooth-Scanner im
            Keyboard-Wedge-Modus.
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
                desc: "Voyager 1200g, Granit 1981i und weitere",
              },
              {
                brand: "Datalogic",
                desc: "QuickScan QD2500, Gryphon GD4500 und weitere",
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
              Jeder USB- oder Bluetooth-Scanner, der im{" "}
              <strong>Keyboard-Wedge-Modus</strong> arbeitet, wird unterstützt.
              Stellen Sie sicher, dass Ihr Scanner so konfiguriert ist, dass er
              nach jedem Scan eine Enter-Taste sendet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
