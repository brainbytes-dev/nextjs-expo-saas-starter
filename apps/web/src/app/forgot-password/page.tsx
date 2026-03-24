"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setError(null)
    try {
      await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      })
      setSent(true)
    } catch {
      setError("Es ist ein Fehler aufgetreten. Bitte versuche es erneut.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Link href="/"><Logo iconSize={28} /></Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Passwort zurücksetzen</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Wir senden dir einen Link zum Zurücksetzen deines Passworts.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-muted/40 p-6 text-center space-y-3">
            <p className="font-medium text-foreground">E-Mail gesendet</p>
            <p className="text-sm text-muted-foreground">
              Falls ein Konto für <span className="font-medium">{email}</span> existiert, erhältst du in Kürze einen Link.
            </p>
            <Link href="/login" className="block text-sm text-primary underline-offset-4 hover:underline">
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@firma.ch"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Wird gesendet…" : "Link senden"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                Zurück zum Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
