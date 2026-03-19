"use client"

import { useState, useEffect } from "react"
import { IconPhoto, IconLoader2, IconDownload } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string | null
}

interface BookingPhotosInlineProps {
  bookingId: string
  entityType?: "tool_booking" | "stock_change"
}

/**
 * Fetches and displays photo thumbnails attached to a booking.
 * Renders nothing when there are no photos.
 */
export function BookingPhotosInline({
  bookingId,
  entityType = "tool_booking",
}: BookingPhotosInlineProps) {
  const [photos, setPhotos] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<Attachment | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/attachments?entityType=${entityType}&entityId=${bookingId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) {
          const images = (Array.isArray(data) ? data : []).filter(
            (a: Attachment) => a.mimeType?.startsWith("image/")
          )
          setPhotos(images)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, entityType])

  if (loading) {
    return (
      <IconLoader2 className="size-3 animate-spin text-muted-foreground/60" />
    )
  }

  if (photos.length === 0) return null

  return (
    <>
      <div className="mt-2 flex gap-2 flex-wrap">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setPreview(photo)}
            className="group relative size-16 overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none"
            aria-label={`Foto anzeigen: ${photo.fileName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.fileUrl}
              alt={photo.fileName}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <IconPhoto className="size-5 text-white" />
            </div>
          </button>
        ))}
      </div>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3">
            <DialogTitle className="truncate text-sm font-medium">
              {preview?.fileName}
            </DialogTitle>
            {preview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a")
                  a.href = `/api/attachments/${preview.id}`
                  a.download = preview.fileName
                  a.target = "_blank"
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }}
              >
                <IconDownload className="size-4" />
                Herunterladen
              </Button>
            )}
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted min-h-[200px] max-h-[70vh] overflow-auto p-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.fileUrl}
                alt={preview.fileName}
                className="max-w-full max-h-[60vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
