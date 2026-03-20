"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { PasswordInput } from "@/components/ui/password-input"
import { TwoFactorSetup } from "@/components/two-factor-setup"
import {
  IconShieldLock,
  IconArrowLeft,
  IconAlertTriangle,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react"

// ─── Two-Factor Settings Page ────────────────────────────────────────────────

export default function TwoFactorSettingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<{
    enabled: boolean
    verifiedAt?: string
    remainingRecoveryCodes?: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [disablePassword, setDisablePassword] = useState("")
  const [disableError, setDisableError] = useState<string | null>(null)
  const [isDisabling, setIsDisabling] = useState(false)
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/two-factor/status", {
        credentials: "include",
      })
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ enabled: false })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleDisable = async () => {
    if (!disablePassword) {
      setDisableError("Bitte Passwort eingeben.")
      return
    }

    setIsDisabling(true)
    setDisableError(null)
    try {
      const res = await fetch("/api/auth/two-factor/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: disablePassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDisableError(data.error || "Fehler beim Deaktivieren.")
        return
      }
      setStatus({ enabled: false })
      setDisableDialogOpen(false)
      setDisablePassword("")
    } catch {
      setDisableError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setIsDisabling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/settings")}
        >
          <IconArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Zwei-Faktor-Authentifizierung
          </h1>
          <p className="text-sm text-muted-foreground">
            Zusatzliche Sicherheitsebene fur Ihr Konto verwalten.
          </p>
        </div>
      </div>

      {/* ── If 2FA is enabled: show status + disable option ── */}
      {status?.enabled ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconShieldLock className="size-5 text-green-600" />
                Zwei-Faktor-Authentifizierung ist aktiv
              </CardTitle>
              <CardDescription>
                Ihr Konto ist mit einem zusatzlichen Sicherheitsfaktor geschutzt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <IconCheck className="mr-1 size-3.5" />
                  Aktiv
                </Badge>
                {status.verifiedAt && (
                  <span className="text-sm text-muted-foreground">
                    Aktiviert am{" "}
                    {new Date(status.verifiedAt).toLocaleDateString("de-CH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>

              {status.remainingRecoveryCodes !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Verbleibende Wiederherstellungscodes:{" "}
                  <span
                    className={
                      status.remainingRecoveryCodes <= 2
                        ? "font-medium text-destructive"
                        : "font-medium"
                    }
                  >
                    {status.remainingRecoveryCodes} von 10
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Disable 2FA */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">
                Zwei-Faktor-Authentifizierung deaktivieren
              </CardTitle>
              <CardDescription>
                Das Deaktivieren der 2FA verringert die Sicherheit Ihres Kontos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    2FA deaktivieren
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <IconAlertTriangle className="size-5 shrink-0" />
                      2FA wirklich deaktivieren?
                    </DialogTitle>
                    <DialogDescription>
                      Geben Sie Ihr Passwort ein, um die Zwei-Faktor-Authentifizierung
                      zu deaktivieren. Alle Wiederherstellungscodes werden geloscht.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="disable-password">Passwort</Label>
                      <PasswordInput
                        id="disable-password"
                        placeholder="Passwort eingeben"
                        value={disablePassword}
                        onChange={(e) => {
                          setDisablePassword(e.target.value)
                          setDisableError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleDisable()
                        }}
                        autoComplete="current-password"
                      />
                    </div>

                    {disableError && (
                      <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <IconAlertTriangle className="size-4 shrink-0" />
                        {disableError}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Abbrechen</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleDisable}
                      disabled={isDisabling || !disablePassword}
                    >
                      {isDisabling ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Deaktiviert...
                        </>
                      ) : (
                        "Deaktivieren"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── If 2FA is not enabled: show setup wizard ── */
        <TwoFactorSetup onComplete={fetchStatus} />
      )}
    </div>
  )
}
