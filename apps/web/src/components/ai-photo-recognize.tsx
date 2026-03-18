"use client"

import { useCallback, useRef, useState } from "react"
import {
  IconCamera,
  IconCheck,
  IconLoader2,
  IconPhoto,
  IconSparkles,
  IconUpload,
  IconX,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecognizeResult {
  name: string
  manufacturer: string
  category: string
  description: string
  estimatedPrice: string
  unit: string
}

interface AiPhotoRecognizeProps {
  /** Called when the user clicks "Übernehmen" for one or more fields */
  onRecognized: (data: Partial<RecognizeResult>) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Field config (label + which key in RecognizeResult)
// ---------------------------------------------------------------------------

const FIELDS: {
  key: keyof RecognizeResult
  label: string
  hint?: string
}[] = [
  { key: "name", label: "Name" },
  { key: "manufacturer", label: "Hersteller" },
  { key: "category", label: "Kategorie" },
  { key: "description", label: "Beschreibung" },
  { key: "estimatedPrice", label: "Richtpreis", hint: "CHF" },
  { key: "unit", label: "Einheit" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiPhotoRecognize({ onRecognized, className }: AiPhotoRecognizeProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecognizeResult | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track which fields the user has already adopted
  const [adopted, setAdopted] = useState<Set<keyof RecognizeResult>>(new Set())

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"]
    if (!ALLOWED.includes(f.type)) {
      setError("Nur JPEG, PNG und WebP werden unterstützt.")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Das Bild darf maximal 5 MB gross sein.")
      return
    }
    setError(null)
    setResult(null)
    setAdopted(new Set())
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
      // Reset input so same file can be re-selected
      e.target.value = ""
    },
    [handleFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const clearImage = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    setAdopted(new Set())
  }, [preview])

  // ── Analysis ───────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setAdopted(new Set())

    try {
      const fd = new FormData()
      fd.append("image", file)

      const res = await fetch("/api/ai/recognize", {
        method: "POST",
        body: fd,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? "Analyse fehlgeschlagen")
      }

      const data = await res.json()
      setResult(data.result as RecognizeResult)
      setIsDemo(!!data.demo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }, [file])

  // ── Adopt helpers ──────────────────────────────────────────────────────────

  const adoptField = useCallback(
    (key: keyof RecognizeResult) => {
      if (!result) return
      onRecognized({ [key]: result[key] })
      setAdopted((prev) => new Set(prev).add(key))
    },
    [result, onRecognized]
  )

  const adoptAll = useCallback(() => {
    if (!result) return
    onRecognized({ ...result })
    setAdopted(new Set(FIELDS.map((f) => f.key)))
  }, [result, onRecognized])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone / preview */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Bild hochladen"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !preview && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !preview) {
            inputRef.current?.click()
          }
        }}
        className={cn(
          "relative flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50",
          preview ? "cursor-default" : "cursor-pointer"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden
        />

        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vorschau"
              className="max-h-48 max-w-full rounded-lg object-contain"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 rounded-full bg-background/80 shadow-sm hover:bg-background"
              onClick={(e) => {
                e.stopPropagation()
                clearImage()
              }}
              aria-label="Bild entfernen"
            >
              <IconX className="size-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <IconCamera className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Foto hier ablegen oder klicken</p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP · max 5 MB</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              <IconUpload className="size-4" />
              Datei wählen
            </Button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Analyse button */}
      {file && !result && (
        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Analysiere Foto...
            </>
          ) : (
            <>
              <IconSparkles className="size-4" />
              Foto analysieren
            </>
          )}
        </Button>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-xl border bg-card shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <IconSparkles className="size-4 text-primary" />
              <span className="text-sm font-semibold">KI-Erkennung</span>
              {isDemo && (
                <Badge variant="secondary" className="text-[10px]">
                  Demo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setResult(null)
                  setAdopted(new Set())
                  setFile(null)
                  if (preview) URL.revokeObjectURL(preview)
                  setPreview(null)
                }}
              >
                Neu scannen
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                onClick={adoptAll}
                disabled={adopted.size === FIELDS.length}
              >
                Alles übernehmen
              </Button>
            </div>
          </div>

          {/* Field rows */}
          <div className="divide-y">
            {FIELDS.map(({ key, label, hint }) => {
              const value = result[key]
              if (!value) return null
              const done = adopted.has(key)
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors",
                    done && "bg-muted/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                      {hint && (
                        <span className="ml-1 normal-case text-muted-foreground/70">
                          ({hint})
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm">
                      {key === "estimatedPrice" && value
                        ? `CHF ${value}`
                        : value}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={done ? "ghost" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 shrink-0 text-xs",
                      done && "text-muted-foreground"
                    )}
                    onClick={() => adoptField(key)}
                    disabled={done}
                    aria-label={done ? "Übernommen" : `${label} übernehmen`}
                  >
                    {done ? (
                      <>
                        <IconCheck className="size-3.5" />
                        Übernommen
                      </>
                    ) : (
                      <>
                        <IconPhoto className="size-3.5" />
                        Übernehmen
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
