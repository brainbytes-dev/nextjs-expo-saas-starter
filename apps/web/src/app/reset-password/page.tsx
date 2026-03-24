"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { authClient } from "@/lib/auth-client"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || !token) return
    setSubmitting(true)
    setError(null)
    try {
      await authClient.resetPassword({ newPassword: password, token })
      setDone(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setError("Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-6 text-center space-y-3">
        <p className="font-medium text-foreground">Ungültiger Link</p>
        <p className="text-sm text-muted-foreground">Der Reset-Link ist ungültig oder fehlt.</p>
        <Link href="/forgot-password" className="block text-sm text-primary underline-offset-4 hover:underline">
          Neuen Link anfordern
        </Link>
      </div>
    )
  }

  return done ? (
    <div className="rounded-lg border border-border bg-muted/40 p-6 text-center space-y-3">
      <p className="font-medium text-foreground">Passwort geändert</p>
      <p className="text-sm text-muted-foreground">Du wirst zum Login weitergeleitet…</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
      </div>
      <Button type="submit" className="w-full" disabled={submitting || password.length < 8}>
        {submitting ? "Wird gespeichert…" : "Passwort speichern"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Link href="/"><Logo iconSize={28} /></Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Neues Passwort setzen</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gib dein neues Passwort ein.
            </p>
          </div>
        </div>
        <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-lg" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
