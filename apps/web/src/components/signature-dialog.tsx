"use client"

// ---------------------------------------------------------------------------
// SignatureDialog — Modal that captures a digital signature, then saves it
// to the commission via PATCH /api/commissions/[id].
//
// Usage:
//   <SignatureDialog
//     commissionId="..."
//     commissionNumber="K-2025-001"
//     open={open}
//     onOpenChange={setOpen}
//     onSigned={(sig) => { /* update local state */ }}
//   />
// ---------------------------------------------------------------------------

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SignatureCanvas, type SignatureCanvasHandle } from "./signature-canvas"

export interface SignatureDialogProps {
  commissionId: string
  commissionNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the signature has been saved to the server. */
  onSigned?: (signatureDataUrl: string, signedBy: string) => void
}

export function SignatureDialog({
  commissionId,
  commissionNumber,
  open,
  onOpenChange,
  onSigned,
}: SignatureDialogProps) {
  const t = useTranslations("signature")
  const canvasRef = useRef<SignatureCanvasHandle>(null)
  const [signedBy, setSignedBy] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const dataUrl = canvasRef.current?.getDataUrl()
    if (!dataUrl) {
      setError(t("pleaseSign"))
      return
    }
    if (!signedBy.trim()) {
      setError(t("enterName"))
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: dataUrl,
          signedBy: signedBy.trim(),
          signedAt: new Date().toISOString(),
          status: "completed",
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "Fehler beim Speichern.")
      }

      onSigned?.(dataUrl, signedBy.trim())
      onOpenChange(false)
      // Reset for potential reuse
      canvasRef.current?.clear()
      setSignedBy("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    canvasRef.current?.clear()
    setSignedBy("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("confirmReceipt")}</DialogTitle>
          <DialogDescription>
            Kommission{" "}
            <span className="font-mono font-medium">{commissionNumber}</span>{" "}
            - {t("confirmDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name of signer */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signed-by">{t("signerName")}</Label>
            <Input
              id="signed-by"
              placeholder="Vor- und Nachname"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Signature pad */}
          <SignatureCanvas
            ref={canvasRef}
            height={180}
            disabled={saving}
            label={t("signature")}
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("saveSignature")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
