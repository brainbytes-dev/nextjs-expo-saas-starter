"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  IconUpload,
  IconTrash,
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconFileTypeXls,
  IconPhoto,
  IconX,
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  STORAGE_MAX_SIZE_BYTES,
  STORAGE_ACCEPTED_EXTENSIONS,
  formatFileSize,
  getFileCategory,
} from "@/lib/storage"

// ── Types ─────────────────────────────────────────────────────────────────

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  uploadedById: string | null
  uploaderName: string | null
  createdAt: string
}

export interface AttachmentsPanelProps {
  entityType: "material" | "tool" | "commission" | "order" | "location" | "key"
  entityId: string
}

// ── File icon helper ──────────────────────────────────────────────────────

function FileIcon({ mimeType, className }: { mimeType: string | null; className?: string }) {
  const cat = getFileCategory(mimeType ?? "")
  switch (cat) {
    case "image":
      return <IconPhoto className={className} />
    case "pdf":
      return <IconFileTypePdf className={className} />
    case "word":
      return <IconFileTypeDoc className={className} />
    case "excel":
      return <IconFileTypeXls className={className} />
    default:
      return <IconFile className={className} />
  }
}

// ── Upload zone ───────────────────────────────────────────────────────────

interface UploadZoneProps {
  onFiles: (files: File[]) => void
  uploading: boolean
}

function UploadZone({ onFiles, uploading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFiles(files)
    // reset so same file can be re-uploaded after deletion
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
        p-6 text-center transition-colors cursor-pointer select-none
        ${dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
        }
        ${uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      {uploading ? (
        <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <IconUpload className="size-8 text-muted-foreground" />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">
          {uploading ? "Wird hochgeladen…" : "Datei hierher ziehen oder klicken"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {STORAGE_ACCEPTED_EXTENSIONS.join(", ")} — max. {formatFileSize(STORAGE_MAX_SIZE_BYTES)}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept={STORAGE_ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleChange}
        disabled={uploading}
      />
    </div>
  )
}

// ── Attachment thumbnail/card ─────────────────────────────────────────────

interface AttachmentCardProps {
  attachment: Attachment
  onDelete: (id: string) => void
  onPreview: (attachment: Attachment) => void
  deleting: boolean
}

function AttachmentCard({ attachment, onDelete, onPreview, deleting }: AttachmentCardProps) {
  const cat = getFileCategory(attachment.mimeType ?? "")
  const isImage = cat === "image"

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      {/* Thumbnail / icon area */}
      <button
        onClick={() => onPreview(attachment)}
        className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-muted transition-colors hover:bg-muted/80 focus-visible:outline-none"
        aria-label={`Vorschau: ${attachment.fileName}`}
      >
        {isImage ? (
          // Next Image can't handle data URLs > configured sizes — use <img> directly
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileIcon
            mimeType={attachment.mimeType}
            className="size-10 text-muted-foreground"
          />
        )}
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="truncate text-xs font-medium text-foreground" title={attachment.fileName}>
          {attachment.fileName}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {attachment.fileSize ? formatFileSize(attachment.fileSize) : ""}
          {attachment.uploaderName ? ` · ${attachment.uploaderName}` : ""}
        </p>
      </div>

      {/* Actions overlay */}
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => downloadAttachment(attachment)}
          className="flex size-6 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm hover:bg-background"
          title="Herunterladen"
        >
          <IconDownload className="size-3.5" />
        </button>
        <button
          onClick={() => onDelete(attachment.id)}
          disabled={deleting}
          className="flex size-6 items-center justify-center rounded-md bg-background/90 text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-50"
          title="Löschen"
        >
          <IconTrash className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function downloadAttachment(attachment: Attachment) {
  const a = document.createElement("a")
  a.href = `/api/attachments/${attachment.id}`
  a.download = attachment.fileName
  a.target = "_blank"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Image preview modal ───────────────────────────────────────────────────

interface PreviewModalProps {
  attachment: Attachment | null
  onClose: () => void
}

function PreviewModal({ attachment, onClose }: PreviewModalProps) {
  const cat = attachment ? getFileCategory(attachment.mimeType ?? "") : null
  const isImage = cat === "image"
  const isPdf = cat === "pdf"

  return (
    <Dialog open={attachment !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <DialogTitle className="truncate text-sm font-medium">
            {attachment?.fileName}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            {attachment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAttachment(attachment)}
              >
                <IconDownload className="size-4" />
                Herunterladen
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex items-center justify-center bg-muted min-h-[300px] max-h-[70vh] overflow-auto p-4">
          {attachment && isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.fileUrl}
              alt={attachment.fileName}
              className="max-w-full max-h-[60vh] object-contain rounded"
            />
          )}
          {attachment && isPdf && (
            <iframe
              src={`/api/attachments/${attachment.id}`}
              className="w-full h-[60vh] border-0 rounded"
              title={attachment.fileName}
            />
          )}
          {attachment && !isImage && !isPdf && (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileIcon mimeType={attachment.mimeType} className="size-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{attachment.fileName}</p>
              <Button variant="outline" onClick={() => downloadAttachment(attachment)}>
                <IconDownload className="size-4" />
                Datei herunterladen
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export function AttachmentsPanel({ entityType, entityId }: AttachmentsPanelProps) {
  const [attachmentsList, setAttachmentsList] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Attachment | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attachments?entityType=${entityType}&entityId=${entityId}`
      )
      if (res.ok) {
        const data = await res.json()
        setAttachmentsList(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    void fetchAttachments()
  }, [fetchAttachments])

  const handleFiles = useCallback(async (files: File[]) => {
    setError(null)
    setUploading(true)
    let uploaded = 0
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append("entityType", entityType)
        formData.append("entityId", entityId)
        formData.append("file", file)

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? "Upload fehlgeschlagen")
        } else {
          uploaded++
        }
      } catch {
        setError("Upload fehlgeschlagen. Bitte erneut versuchen.")
      }
    }
    if (uploaded > 0) {
      await fetchAttachments()
    }
    setUploading(false)
  }, [entityType, entityId, fetchAttachments])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" })
      if (res.ok) {
        setAttachmentsList((prev) => prev.filter((a) => a.id !== id))
        if (preview?.id === id) setPreview(null)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Löschen fehlgeschlagen")
      }
    } catch {
      setError("Löschen fehlgeschlagen. Bitte erneut versuchen.")
    } finally {
      setDeletingId(null)
    }
  }, [preview])

  return (
    <div className="space-y-4">
      <UploadZone onFiles={handleFiles} uploading={uploading} />

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <IconX className="size-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : attachmentsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <IconPhoto className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Noch keine Anhänge vorhanden</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {attachmentsList.map((a) => (
            <AttachmentCard
              key={a.id}
              attachment={a}
              onDelete={handleDelete}
              onPreview={setPreview}
              deleting={deletingId === a.id}
            />
          ))}
        </div>
      )}

      <PreviewModal attachment={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
