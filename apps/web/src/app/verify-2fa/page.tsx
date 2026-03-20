"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
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
import {
  IconShieldLock,
  IconKey,
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react"

// ─── Post-login 2FA Verification Page ────────────────────────────────────────

export default function Verify2FAPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"totp" | "recovery">("totp")
  const [code, setCode] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const recoveryInputRef = useRef<HTMLInputElement>(null)

  // ── Verify TOTP code ──
  const handleVerifyTotp = async () => {
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
      if (data.verified) {
        router.replace("/dashboard")
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Verify recovery code ──
  const handleVerifyRecovery = async () => {
    const trimmed = recoveryCode.trim().toLowerCase()
    if (!/^[a-f0-9]{8}$/.test(trimmed)) {
      setError("Bitte einen gultigen 8-stelligen Wiederherstellungscode eingeben.")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/two-factor/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recoveryCode: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Wiederherstellung fehlgeschlagen.")
        return
      }
      if (data.verified) {
        router.replace("/dashboard")
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Branding */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <IconShieldLock className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Zwei-Faktor-Verifizierung
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bestatigen Sie Ihre Identitat, um fortzufahren.
          </p>
        </div>

        {/* ── TOTP Mode ── */}
        {mode === "totp" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authenticator-Code</CardTitle>
              <CardDescription>
                Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-code">Code</Label>
                <Input
                  ref={codeInputRef}
                  id="verify-code"
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
                    if (e.key === "Enter" && code.length === 6) handleVerifyTotp()
                  }}
                  className="text-center text-xl font-mono tracking-[0.3em]"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <IconAlertTriangle className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button
                onClick={handleVerifyTotp}
                disabled={isLoading || code.length !== 6}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 size-4 animate-spin" />
                    Wird verifiziert...
                  </>
                ) : (
                  "Verifizieren"
                )}
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("recovery")
                    setError(null)
                    setCode("")
                    setTimeout(() => recoveryInputRef.current?.focus(), 100)
                  }}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  <IconKey className="mr-1 inline-block size-3.5" />
                  Wiederherstellungscode verwenden
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── Recovery Mode ── */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wiederherstellungscode</CardTitle>
              <CardDescription>
                Geben Sie einen Ihrer gespeicherten Wiederherstellungscodes ein.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-code">Wiederherstellungscode</Label>
                <Input
                  ref={recoveryInputRef}
                  id="recovery-code"
                  type="text"
                  maxLength={8}
                  placeholder="a1b2c3d4"
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 8))
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && recoveryCode.length === 8) handleVerifyRecovery()
                  }}
                  className="text-center text-lg font-mono tracking-wider"
                  autoFocus
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <IconAlertTriangle className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button
                onClick={handleVerifyRecovery}
                disabled={isLoading || recoveryCode.length !== 8}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 size-4 animate-spin" />
                    Wird verifiziert...
                  </>
                ) : (
                  "Mit Code anmelden"
                )}
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("totp")
                    setError(null)
                    setRecoveryCode("")
                    setTimeout(() => codeInputRef.current?.focus(), 100)
                  }}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  <IconShieldLock className="mr-1 inline-block size-3.5" />
                  Authenticator-Code verwenden
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
