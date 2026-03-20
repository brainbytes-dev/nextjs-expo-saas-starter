"use client"

import { useCallback, useEffect, useState } from "react"
import { IconChevronLeft, IconChevronRight, IconX, IconZoomIn, IconZoomOut } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface PhotoLightboxProps {
  photos: { id: string; fileUrl: string; fileName: string }[]
  initialIndex: number
  onClose: () => void
}

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [zoomed, setZoomed] = useState(false)

  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
    setZoomed(false)
  }, [])

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(photos.length - 1, i + 1))
    setZoomed(false)
  }, [photos.length])

  const toggleZoom = useCallback(() => setZoomed((z) => !z), [])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          if (hasPrev) goPrev()
          break
        case "ArrowRight":
          if (hasNext) goNext()
          break
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, goPrev, goNext, hasPrev, hasNext])

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  if (!photo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <IconX className="size-5" />
      </Button>

      {/* Zoom button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-14 z-50 text-white hover:bg-white/10"
        onClick={toggleZoom}
      >
        {zoomed ? (
          <IconZoomOut className="size-5" />
        ) : (
          <IconZoomIn className="size-5" />
        )}
      </Button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-50 text-sm text-white/70">
        {index + 1} / {photos.length}
      </div>

      {/* Filename */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md truncate text-sm text-white/70">
        {photo.fileName}
      </div>

      {/* Previous button */}
      {hasPrev && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 z-50 h-12 w-12 rounded-full text-white hover:bg-white/10"
          onClick={goPrev}
        >
          <IconChevronLeft className="size-6" />
        </Button>
      )}

      {/* Next button */}
      {hasNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 z-50 h-12 w-12 rounded-full text-white hover:bg-white/10"
          onClick={goNext}
        >
          <IconChevronRight className="size-6" />
        </Button>
      )}

      {/* Image */}
      <div
        className="relative z-40 flex items-center justify-center"
        onDoubleClick={toggleZoom}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.fileUrl}
          alt={photo.fileName}
          className={`transition-transform duration-200 select-none ${
            zoomed
              ? "max-h-none max-w-none scale-150 cursor-zoom-out"
              : "max-h-[85vh] max-w-[90vw] cursor-zoom-in"
          }`}
          style={{ objectFit: "contain" }}
          draggable={false}
        />
      </div>
    </div>
  )
}
