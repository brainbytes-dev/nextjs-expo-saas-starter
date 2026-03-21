"use client"

import { useState } from "react"
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
import { IconTrash, IconAlertTriangle } from "@tabler/icons-react"

export function DsgvoDeleteCard() {
  const t = useTranslations("dsgvo")
  const [password, setPassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

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
    } catch {
      setError(
        t("deleteFailed")
      )
    } finally {
      setIsDeleting(false)
    }
  }

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
              strong: (chunks) => <strong>{chunks}</strong>,
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
