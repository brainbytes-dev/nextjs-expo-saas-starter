"use client"

import { useRef, useState } from "react"
import { IconCamera, IconX, IconPhoto } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface BookingPhotoButtonProps {
  /**
   * Called when the user selects a photo.
   * `file` is the raw File object; `previewUrl` is a local object URL for display.
   * Pass `null` to clear the current photo.
   */
  onPhoto: (file: File | null, previewUrl: string | null) => void
  previewUrl: string | null
}

/**
 * Compact inline photo capture button used inside booking dialogs.
 * Accepts images only (JPEG/PNG/WEBP). The photo is not uploaded here —
 * the parent handles upload after the booking is created.
 */
export function BookingPhotoButton({ onPhoto, previewUrl }: BookingPhotoButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      setError("Nur JPEG, PNG, WEBP oder GIF erlaubt.")
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Foto zu gross. Max. 5 MB.")
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    const url = URL.createObjectURL(file)
    onPhoto(file, url)
    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onPhoto(null, null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Foto (optional)</p>

      {previewUrl ? (
        <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Foto-Vorschau"
            className="max-h-40 w-full object-contain"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
            aria-label="Foto entfernen"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
        >
          <IconCamera className="size-5" />
          Zustand fotografieren
          <IconPhoto className="size-4 opacity-60" />
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        // @ts-ignore: capture is a valid HTML attribute for mobile camera
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        aria-hidden
      />
    </div>
  )
}
