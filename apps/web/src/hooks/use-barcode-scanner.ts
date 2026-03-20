"use client"

import { useEffect, useRef, useCallback } from "react"

const SCANNER_THRESHOLD_MS = 50 // max ms between keystrokes for scanner input
const BUFFER_TIMEOUT_MS = 200 // reset buffer after this idle time
const MIN_BARCODE_LENGTH = 4 // shortest valid barcode

/**
 * Detects barcode scanner input via keyboard wedge mode.
 *
 * Hardware scanners emulate rapid keystrokes (<50ms apart) followed by Enter.
 * Normal human typing is much slower (>100ms between keys).
 *
 * Ignores input when the user is focused on an input/textarea/select element
 * so that normal typing is never intercepted.
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  enabled = true
) {
  const bufferRef = useRef("")
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onScanRef = useRef(onScan)

  // Keep callback ref fresh without re-attaching listener
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const resetBuffer = useCallback(() => {
    bufferRef.current = ""
    lastKeyTimeRef.current = 0
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in a form field
      const tag = (document.activeElement?.tagName ?? "").toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return
      }

      // Also ignore contentEditable elements
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement.isContentEditable
      ) {
        return
      }

      const now = Date.now()

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Enter key = end of scan
      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim()
        if (barcode.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault()
          e.stopPropagation()
          onScanRef.current(barcode)
        }
        resetBuffer()
        return
      }

      // Only accept printable single characters
      if (e.key.length !== 1) {
        return
      }

      // Ignore modifier combos (Ctrl+C, Cmd+V, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return
      }

      const timeSinceLast = now - lastKeyTimeRef.current

      // If too slow, this is human typing — reset
      if (lastKeyTimeRef.current > 0 && timeSinceLast > SCANNER_THRESHOLD_MS) {
        resetBuffer()
      }

      bufferRef.current += e.key
      lastKeyTimeRef.current = now

      // Auto-reset buffer after idle period
      timeoutRef.current = setTimeout(() => {
        resetBuffer()
      }, BUFFER_TIMEOUT_MS)
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, resetBuffer])
}
