"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { IconTrash, IconAlertTriangle, IconRotate } from "@tabler/icons-react"

interface DeletionStatus {
  pending: boolean
  requestedAt?: string
  deletionDate?: string
}

export function DsgvoDeleteCard() {
  const t = useTranslations("dsgvo")
  const [password, setPassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<DeletionStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/dsgvo/delete")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      // Silent fail — show default state
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleDelete = async () => {
    setError(null)

    if (!password.trim()) {
      setError(t("deletePasswordRequired"))
      return
    }

    setIsDeleting(true)

    try {
      const res = await fetch("/api/dsgvo/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(
          data?.error ??
            t("deleteFailed")
        )
        return
      }

      setSuccess(data?.message ?? t("deleteSuccess"))
      setOpen(false)
      setPassword("")
      // Refresh status to show pending state
      await fetchStatus()
    } catch {
      setError(
        t("deleteFailed")
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDeletion = async () => {
    setError(null)
    setIsCancelling(true)

    try {
      const res = await fetch("/api/dsgvo/cancel-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error ?? "Widerruf fehlgeschlagen.")
        return
      }

      setSuccess(data?.message ?? "Löschanfrage wurde widerrufen.")
      setStatus({ pending: false })
    } catch {
      setError("Widerruf fehlgeschlagen. Bitte versuchen Sie es erneut.")
    } finally {
      setIsCancelling(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getDaysRemaining = (deletionDateStr: string) => {
    const now = new Date()
    const deletionDate = new Date(deletionDateStr)
    const diffMs = deletionDate.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  if (isLoadingStatus) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconTrash className="size-5 text-destructive" aria-hidden />
            <CardTitle className="text-destructive">{t("deleteTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Lade Status...</p>
        </CardContent>
      </Card>
    )
  }

  // Pending deletion state
  if (status?.pending && status.deletionDate) {
    const daysRemaining = getDaysRemaining(status.deletionDate)

    return (
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-orange-600" aria-hidden />
            <CardTitle className="text-orange-700 dark:text-orange-400">
              Löschung ausstehend
            </CardTitle>
          </div>
          <CardDescription>
            Ihre Kontolöschung wurde beantragt und wird nach Ablauf der Frist durchgeführt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beantragt am:</span>
                  <span className="font-medium">
                    {status.requestedAt ? formatDate(status.requestedAt) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Löschung am:</span>
                  <span className="font-medium text-destructive">
                    {formatDate(status.deletionDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verbleibende Tage:</span>
                  <span className="font-bold text-orange-700 dark:text-orange-400">
                    {daysRemaining} {daysRemaining === 1 ? "Tag" : "Tage"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Sie können die Löschung innerhalb der 30-tägigen Frist jederzeit widerrufen.
              Nach Ablauf werden alle Daten unwiderruflich gelöscht.
            </p>

            {success && (
              <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {success}
              </p>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              variant="outline"
              onClick={handleCancelDeletion}
              disabled={isCancelling}
              className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              <IconRotate className="mr-2 size-4" aria-hidden />
              {isCancelling ? "Wird widerrufen..." : "Löschung widerrufen"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default state — no pending deletion
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconTrash className="size-5 text-destructive" aria-hidden />
          <CardTitle className="text-destructive">{t("deleteTitle")}</CardTitle>
        </div>
        <CardDescription>
          {t("deleteDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.rich("deleteGracePeriod", {
              strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
            })}
          </p>

          <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t("deleteDataProfile")}</li>
            <li>{t("deleteDataStock")}</li>
            <li>{t("deleteDataToolBookings")}</li>
            <li>{t("deleteDataTimeEntries")}</li>
            <li>{t("deleteDataComments")}</li>
            <li>{t("deleteDataCommissions")}</li>
          </ul>

          {success && (
            <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {success}
            </p>
          )}

          {error && !open && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={!!success}>
                <IconTrash className="mr-2 size-4" aria-hidden />
                {t("deleteRequest")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <IconAlertTriangle className="size-5 shrink-0" aria-hidden />
                  {t("deleteConfirmTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("deleteConfirmDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="delete-password">
                    {t("deletePasswordLabel")}
                  </Label>
                  <PasswordInput
                    id="delete-password"
                    placeholder={t("deletePasswordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isDeleting}
                    autoComplete="current-password"
                  />
                </div>

                {error && open && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline" disabled={isDeleting}>
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? t("deleteProcessing")
                    : t("deleteConfirmButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
