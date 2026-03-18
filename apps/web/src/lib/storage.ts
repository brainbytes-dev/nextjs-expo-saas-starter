// ─── Storage Utility ───────────────────────────────────────────────────────
// Stores files as base64 data URLs in the database (no external service needed).
// Max 5 MB per file. Accepted: images, PDF, Word, Excel.

export const STORAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const STORAGE_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export const STORAGE_ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]

export interface UploadResult {
  url: string
  fileName: string
  mimeType: string
  size: number
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "READ_ERROR"
  ) {
    super(message)
    this.name = "StorageError"
  }
}

/**
 * Converts a File to a base64 data URL and validates size / type.
 * Runs in the browser only (uses FileReader).
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  if (file.size > STORAGE_MAX_SIZE_BYTES) {
    throw new StorageError(
      `Datei zu groß. Maximum: 5 MB (hochgeladen: ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      "FILE_TOO_LARGE"
    )
  }

  const mime = file.type || guessMimeFromName(file.name)
  if (!STORAGE_ACCEPTED_MIME_TYPES.includes(mime)) {
    throw new StorageError(
      `Dateityp nicht unterstützt: ${mime || file.name}. Erlaubt: Bilder, PDF, Word, Excel.`,
      "INVALID_TYPE"
    )
  }

  const url = await readAsDataURL(file)
  return { url, fileName: file.name, mimeType: mime, size: file.size }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () =>
      reject(new StorageError("Datei konnte nicht gelesen werden", "READ_ERROR"))
    reader.readAsDataURL(file)
  })
}

function guessMimeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? ""
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
  return map[ext] ?? ""
}

/** Returns a human-readable file size string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Returns the display category for a MIME type. */
export function getFileCategory(mimeType: string): "image" | "pdf" | "word" | "excel" | "file" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "word"
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return "excel"
  return "file"
}
