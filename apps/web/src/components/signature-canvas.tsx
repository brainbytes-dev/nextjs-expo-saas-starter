"use client"

// ---------------------------------------------------------------------------
// SignatureCanvas — Draw a signature with mouse or touch.
//
// Usage:
//   <SignatureCanvas onCapture={(dataUrl) => setSig(dataUrl)} />
//
// The `onCapture` callback is fired after every stroke ends (pointerup /
// touch end) with the current canvas content as a base64 PNG data URL.
// Call ref.current?.clear() to programmatically reset, or use the built-in
// "Löschen" button.
// ---------------------------------------------------------------------------

import {
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Public handle type ─────────────────────────────────────────────────────
export interface SignatureCanvasHandle {
  /** Clear the canvas and reset internal state. */
  clear: () => void
  /** Returns the current signature as a base64 PNG data URL, or null if empty. */
  getDataUrl: () => string | null
  /** Returns true if the user has drawn at least one stroke. */
  isEmpty: () => boolean
}

// ── Props ──────────────────────────────────────────────────────────────────
export interface SignatureCanvasProps {
  /** Called after every stroke ends with the PNG data URL. */
  onCapture?: (dataUrl: string) => void
  /** Called when the canvas is cleared. */
  onClear?: () => void
  /** Canvas height in px. Defaults to 160. */
  height?: number
  /** Additional class name for the outer wrapper. */
  className?: string
  /** Ink colour. Defaults to "#111111". */
  strokeColor?: string
  /** Line width. Defaults to 2.5. */
  strokeWidth?: number
  /** Optional label shown above the canvas. */
  label?: string
  /** Disable drawing (e.g. after the commission is already signed). */
  disabled?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────
export const SignatureCanvas = forwardRef<
  SignatureCanvasHandle,
  SignatureCanvasProps
>(function SignatureCanvas(
  {
    onCapture,
    onClear,
    height = 160,
    className,
    strokeColor = "#111111",
    strokeWidth = 2.5,
    label = "Unterschrift",
    disabled = false,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  // ── Canvas helpers ───────────────────────────────────────────────────────
  function getCtx(): CanvasRenderingContext2D | null {
    return canvasRef.current?.getContext("2d") ?? null
  }

  function getDataUrl(): string {
    return canvasRef.current?.toDataURL("image/png") ?? ""
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawing.current = false
    lastPos.current = null
    setIsEmpty(true)
    onClear?.()
  }

  // ── Expose imperative handle ─────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    clear() {
      clearCanvas()
    },
    getDataUrl() {
      return isEmpty ? null : getDataUrl()
    },
    isEmpty() {
      return isEmpty
    },
  }))

  // Convert a pointer/touch event position to canvas-relative coordinates,
  // accounting for devicePixelRatio scaling.
  function toCanvasPos(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  // ── Resize handling ──────────────────────────────────────────────────────
  // Keep the canvas buffer size in sync with its CSS size and devicePixelRatio
  // so lines stay crisp on Retina / high-DPI screens.
  const resizeObserver = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function sync() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
    }

    sync()
    resizeObserver.current = new ResizeObserver(sync)
    resizeObserver.current.observe(canvas)

    return () => {
      resizeObserver.current?.disconnect()
    }
  }, [strokeColor, strokeWidth])

  // ── Drawing callbacks ────────────────────────────────────────────────────
  const startDraw = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return
      const canvas = canvasRef.current
      const ctx = getCtx()
      if (!canvas || !ctx) return
      const pos = toCanvasPos(canvas, clientX, clientY)
      drawing.current = true
      lastPos.current = pos
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      // Draw a dot for a tap with no movement
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, 2 * Math.PI)
      ctx.fillStyle = strokeColor
      ctx.fill()
    },
    [disabled, strokeColor, strokeWidth],
  )

  const draw = useCallback(
    (clientX: number, clientY: number) => {
      if (!drawing.current || disabled) return
      const canvas = canvasRef.current
      const ctx = getCtx()
      if (!canvas || !ctx || !lastPos.current) return
      const pos = toCanvasPos(canvas, clientX, clientY)
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      lastPos.current = pos
    },
    [disabled],
  )

  const endDraw = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    lastPos.current = null
    setIsEmpty(false)
    if (onCapture) {
      onCapture(getDataUrl())
    }
  }, [onCapture])

  // ── Pointer events (covers mouse + stylus) ───────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      startDraw(e.clientX, e.clientY)
    },
    [startDraw],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draw(e.clientX, e.clientY)
    },
    [draw],
  )

  // ── Touch events (fallback for older mobile browsers) ───────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault() // prevent scroll hijack
      const t = e.touches[0]
      if (t) startDraw(t.clientX, t.clientY)
    },
    [startDraw],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const t = e.touches[0]
      if (t) draw(t.clientX, t.clientY)
    },
    [draw],
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {!isEmpty && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Löschen
          </Button>
        )}
      </div>
      <div
        className={cn(
          "relative rounded-md border border-input bg-background overflow-hidden",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "cursor-crosshair",
        )}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={endDraw}
          aria-label={label}
        />
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-muted-foreground/40 text-sm">
              Hier unterschreiben …
            </p>
          </div>
        )}
        {/* horizontal guide line */}
        <div
          className="absolute left-4 right-4 bottom-10 h-px bg-border pointer-events-none"
          aria-hidden
        />
      </div>
      {isEmpty && !disabled && (
        <p className="text-xs text-muted-foreground">
          Mit Maus oder Finger auf dem Touchscreen zeichnen.
        </p>
      )}
    </div>
  )
})
