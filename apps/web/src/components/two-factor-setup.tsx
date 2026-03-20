"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  IconShieldLock,
  IconKey,
  IconCheck,
  IconCopy,
  IconDownload,
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SetupData {
  secret: string
  qrDataUrl: string
  otpauthUri: string
}

interface TwoFactorSetupProps {
  onComplete?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [code, setCode] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: Start setup, get QR code ──
  const handleStartSetup = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/two-factor/setup", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler beim Einrichten.")
        return
      }
      setSetupData(data)
      setStep(2)
      // Focus code input after render
      setTimeout(() => codeInputRef.current?.focus(), 100)
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: Verify TOTP code ──
  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Bitte einen 6-stelligen Code eingeben.")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Verifizierung fehlgeschlagen.")
        return
      }
      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes)
        setStep(3)
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Copy recovery codes ──
  const handleCopyRecoveryCodes = async () => {
    const text = recoveryCodes.join("\n")
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Download recovery codes ──
  const handleDownloadRecoveryCodes = () => {
    const text = [
      "LogistikApp — Wiederherstellungscodes",
      "Erstellt: " + new Date().toLocaleDateString("de-CH"),
      "",
      "WICHTIG: Bewahren Sie diese Codes sicher auf.",
      "Jeder Code kann nur einmal verwendet werden.",
      "",
      ...recoveryCodes.map((c, i) => `${i + 1}. ${c}`),
    ].join("\n")

    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "logistikapp-recovery-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Copy secret key ──
  const handleCopySecret = async () => {
    if (!setupData) return
    await navigator.clipboard.writeText(setupData.secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  // ── Render steps ──────────────────────────────────────────────────────────

  // Step 1: Introduction
  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconShieldLock className="size-5" />
            Zwei-Faktor-Authentifizierung einrichten
          </CardTitle>
          <CardDescription>
            Schutzen Sie Ihr Konto mit einem zusatzlichen Sicherheitsfaktor.
            Sie benotigen eine Authenticator-App wie Google Authenticator,
            Authy oder 1Password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {error}
            </p>
          )}
          <Button onClick={handleStartSetup} disabled={isLoading}>
            {isLoading ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                Wird eingerichtet...
              </>
            ) : (
              "Einrichtung starten"
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 2: QR Code + Verify
  if (step === 2 && setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconShieldLock className="size-5" />
            QR-Code scannen
          </CardTitle>
          <CardDescription>
            Scannen Sie den QR-Code mit Ihrer Authenticator-App und geben
            Sie den angezeigten 6-stelligen Code ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setupData.qrDataUrl}
                alt="QR-Code fur Authenticator-App"
                className="size-48"
              />
            </div>

            {/* Manual entry */}
            <div className="w-full space-y-2">
              <p className="text-sm text-muted-foreground">
                Oder geben Sie diesen Schlussel manuell ein:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">
                  {setupData.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  title="Schlussel kopieren"
                >
                  {copiedSecret ? (
                    <IconCheck className="size-4 text-green-600" />
                  ) : (
                    <IconCopy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Verify code input */}
          <div className="space-y-2">
            <Label htmlFor="totp-code">6-stelliger Code</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={codeInputRef}
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6)
                  setCode(v)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length === 6) handleVerify()
                }}
                className="max-w-[160px] text-center text-lg font-mono tracking-widest"
                autoComplete="one-time-code"
              />
              <Button onClick={handleVerify} disabled={isLoading || code.length !== 6}>
                {isLoading ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  "Verifizieren"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <IconAlertTriangle className="size-4 shrink-0" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Step 3: Recovery codes
  if (step === 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconKey className="size-5" />
            Wiederherstellungscodes sichern
          </CardTitle>
          <CardDescription>
            Speichern Sie diese Codes an einem sicheren Ort. Falls Sie den
            Zugang zu Ihrer Authenticator-App verlieren, konnen Sie sich
            mit einem dieser Codes anmelden. Jeder Code kann nur einmal
            verwendet werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code, i) => (
                <code
                  key={i}
                  className="rounded bg-background px-3 py-1.5 text-center font-mono text-sm"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopyRecoveryCodes}>
              {copied ? (
                <>
                  <IconCheck className="mr-2 size-4 text-green-600" />
                  Kopiert
                </>
              ) : (
                <>
                  <IconCopy className="mr-2 size-4" />
                  Codes kopieren
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDownloadRecoveryCodes}>
              <IconDownload className="mr-2 size-4" />
              Als Datei herunterladen
            </Button>
          </div>

          <div className="rounded-md border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950/20">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Wichtig: Diese Codes werden nur einmal angezeigt.
            </p>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Bewahren Sie sie sicher auf, bevor Sie fortfahren.
            </p>
          </div>

          <Button
            onClick={() => {
              setStep(4)
              onComplete?.()
            }}
          >
            Ich habe die Codes gesichert
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 4: Done
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCheck className="size-5 text-green-600" />
          Zwei-Faktor-Authentifizierung aktiviert
        </CardTitle>
        <CardDescription>
          Ihr Konto ist jetzt mit einem zusatzlichen Sicherheitsfaktor
          geschutzt. Bei jeder Anmeldung wird ein Code aus Ihrer
          Authenticator-App abgefragt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <IconShieldLock className="mr-1 size-3.5" />
          2FA Aktiv
        </Badge>
      </CardContent>
    </Card>
  )
}
