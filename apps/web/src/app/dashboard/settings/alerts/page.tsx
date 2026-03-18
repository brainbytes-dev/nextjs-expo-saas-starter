"use client"

// Note: IconRefresh may be IconRotate in newer @tabler/icons-react versions
// eslint-disable-next-line @typescript-eslint/no-unused-vars

import { useState, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

interface AlertSettingsData {
  id: string | null
  whatsappPhone: string | null
  emailAlerts: boolean
  whatsappAlerts: boolean
  lowStockThreshold: number
  maintenanceAlertDays: number
  autoReorder: boolean
  reorderTargetMultiplier: number
}

export default function AlertSettingsPage() {
  const [settings, setSettings] = useState<AlertSettingsData>({
    id: null,
    whatsappPhone: "",
    emailAlerts: true,
    whatsappAlerts: false,
    lowStockThreshold: 1,
    maintenanceAlertDays: 7,
    autoReorder: false,
    reorderTargetMultiplier: 2,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    const load = async () => {
      try {
        const res = await fetch("/api/alert-settings")
        if (res.ok) {
          const data: AlertSettingsData = await res.json()
          if (isMounted.current) {
            setSettings({
              ...data,
              whatsappPhone: data.whatsappPhone ?? "",
              autoReorder: data.autoReorder ?? false,
              reorderTargetMultiplier: data.reorderTargetMultiplier ?? 2,
            })
          }
        }
      } catch {
        // silent — use defaults
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }
    void load()
    return () => { isMounted.current = false }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch("/api/alert-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          whatsappPhone: settings.whatsappPhone?.trim() || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? "Speichern fehlgeschlagen")
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setSaving(false)
    }
  }

  const handleTestWhatsApp = async () => {
    setTestResult(null)
    setError(null)
    const phone = settings.whatsappPhone?.trim()
    if (!phone) {
      setError("Bitte zuerst eine Telefonnummer eingeben.")
      return
    }
    setTesting(true)
    try {
      const res = await fetch("/api/alert-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const body = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Testnachricht fehlgeschlagen")
      }
      setTestResult("Testnachricht erfolgreich gesendet!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Einstellungen laden...
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Benachrichtigungen</h1>
        <p className="text-muted-foreground mt-2">
          Konfiguriere automatische Alerts bei Unterbestand und fälligen Wartungen.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {testResult && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {testResult}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* Alert Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Benachrichtigungskanäle</CardTitle>
            <CardDescription>
              Lege fest, auf welchen Wegen du informiert werden möchtest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Email Alerts */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">E-Mail Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Tägliche Zusammenfassung per E-Mail an den Organisations-Inhaber.
                </p>
              </div>
              <Switch
                checked={settings.emailAlerts}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, emailAlerts: v }))}
              />
            </div>

            <Separator />

            {/* WhatsApp Alerts */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">WhatsApp Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Tägliche Nachricht via Twilio WhatsApp an die unten eingetragene Nummer.
                </p>
              </div>
              <Switch
                checked={settings.whatsappAlerts}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, whatsappAlerts: v }))}
              />
            </div>

            {settings.whatsappAlerts && (
              <div className="space-y-3 pl-0 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp-phone">WhatsApp Nummer</Label>
                  <div className="flex gap-2">
                    <Input
                      id="whatsapp-phone"
                      type="tel"
                      placeholder="+41791234567"
                      value={settings.whatsappPhone ?? ""}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, whatsappPhone: e.target.value }))
                      }
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestWhatsApp}
                      disabled={testing}
                    >
                      {testing ? "Senden..." : "Test-Nachricht senden"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Format: +41791234567 (mit Landesvorwahl). Erfordert Twilio-Konfiguration.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Schwellenwerte</CardTitle>
            <CardDescription>
              Ab wann soll ein Alert ausgeloest werden?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="low-stock-threshold">Meldebestand-Schwelle</Label>
              <Input
                id="low-stock-threshold"
                type="number"
                min={0}
                max={9999}
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, lowStockThreshold: Number(e.target.value) }))
                }
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Alert, wenn Bestand gleich oder unter diesem Wert liegt.
              </p>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="maintenance-alert-days">Wartungs-Vorlaufzeit (Tage)</Label>
              <Input
                id="maintenance-alert-days"
                type="number"
                min={1}
                max={90}
                value={settings.maintenanceAlertDays}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, maintenanceAlertDays: Number(e.target.value) }))
                }
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Alert, wenn die naechste Wartung innerhalb dieser Tage faellig ist.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Nachbestellung */}
        <Card>
          <CardHeader>
            <CardTitle>Auto-Nachbestellung</CardTitle>
            <CardDescription>
              Automatisch Bestellvorschläge (Entwürfe) erstellen, wenn der Meldebestand unterschritten wird.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Auto-Nachbestellung aktivieren</p>
                <p className="text-sm text-muted-foreground">
                  Täglich um 08:00 Uhr werden automatisch Bestell-Entwürfe für Materialien unter Meldebestand erstellt.
                </p>
              </div>
              <Switch
                checked={settings.autoReorder}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, autoReorder: v }))}
              />
            </div>

            {settings.autoReorder && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <Label htmlFor="reorder-multiplier">Ziel-Bestand (Vielfaches des Meldebestands)</Label>
                  <Input
                    id="reorder-multiplier"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.reorderTargetMultiplier}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, reorderTargetMultiplier: Math.max(1, Math.min(10, Number(e.target.value))) }))
                    }
                    className="max-w-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bestellmenge = (Meldebestand × Multiplikator) − aktueller Bestand. Standard: 2×.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern..." : "Einstellungen speichern"}
          </Button>
          {saved && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Gespeichert!
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
