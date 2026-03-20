"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  IconPhoto,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconUpload,
  IconAlertCircle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PhotoLightbox } from "@/components/photo-lightbox"

const MAX_PHOTOS = 10
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

interface Photo {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploaderName: string | null
  createdAt: string
}

interface MaterialPhotoGalleryProps {
  materialId: string
}

export function MaterialPhotoGallery({ materialId }: MaterialPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch photos ──────────────────────────────────────────────────────
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attachments?entityType=material&entityId=${materialId}`
      )
      if (!res.ok) throw new Error("Fehler beim Laden der Fotos")
      const data: Photo[] = await res.json()
      // Filter to images only
      setPhotos(data.filter((p) => IMAGE_MIME_TYPES.includes(p.mimeType)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }, [materialId])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  // ── Upload ────────────────────────────────────────────────────────────
  const uploadFile = useCallback(
    async (file: File) => {
      if (photos.length >= MAX_PHOTOS) {
        setError(`Maximal ${MAX_PHOTOS} Fotos pro Material erlaubt.`)
        return
      }
      if (!IMAGE_MIME_TYPES.includes(file.type)) {
        setError("Nur Bilder (JPEG, PNG, GIF, WebP) sind erlaubt.")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Maximale Dateigrösse: 5 MB.")
        return
      }

      setUploading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append("entityType", "material")
        formData.append("entityId", materialId)
        formData.append("file", file)

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(
            (json as { error?: string }).error ?? "Upload fehlgeschlagen"
          )
        }

        await fetchPhotos()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen")
      } finally {
        setUploading(false)
      }
    },
    [materialId, photos.length, fetchPhotos]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadFile(file)
      // Reset input so the same file can be re-selected
      e.target.value = ""
    },
    [uploadFile]
  )

  // ── Drag & Drop ───────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (photoId: string) => {
      if (!confirm("Foto wirklich löschen?")) return

      setDeleting(photoId)
      setError(null)

      try {
        const res = await fetch(`/api/attachments/${photoId}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(
            (json as { error?: string }).error ?? "Löschen fehlgeschlagen"
          )
        }
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen")
      } finally {
        setDeleting(null)
      }
    },
    []
  )

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IconPhoto className="size-4 text-primary" />
              Fotos ({photos.length}/{MAX_PHOTOS})
            </CardTitle>
            {photos.length < MAX_PHOTOS && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconPlus className="size-3.5" />
                )}
                Foto hinzufügen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Error */}
          {error && (
            <div className="mb-3 flex items-center gap-1.5 text-sm text-destructive">
              <IconAlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Photo grid */}
              <div
                className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
                  dragOver
                    ? "rounded-lg ring-2 ring-primary ring-offset-2"
                    : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/30 cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => setLightboxIndex(idx)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.fileUrl}
                      alt={photo.fileName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                    {/* Delete button */}
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(photo.id)
                      }}
                      disabled={deleting === photo.id}
                      title="Foto löschen"
                    >
                      {deleting === photo.id ? (
                        <IconLoader2 className="size-3.5 animate-spin" />
                      ) : (
                        <IconTrash className="size-3.5" />
                      )}
                    </button>
                    {/* File name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-xs text-white">
                        {photo.fileName}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Upload drop zone (visible when fewer than max) */}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                      dragOver
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/25 text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <IconLoader2 className="size-6 animate-spin" />
                    ) : (
                      <>
                        <IconUpload className="size-6" />
                        <span className="text-xs">
                          {dragOver ? "Hier ablegen" : "Hochladen"}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Empty state */}
              {photos.length === 0 && !dragOver && (
                <div
                  className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-8 text-center"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <IconPhoto className="size-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Noch keine Fotos vorhanden.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Ziehen Sie Bilder hierher oder klicken Sie auf
                    &quot;Foto hinzufügen&quot;.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
