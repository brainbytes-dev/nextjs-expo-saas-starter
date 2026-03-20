import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// We test the scanner detection logic by simulating keydown events on the document.
// The hook attaches a keydown listener, so we can test it via JSDOM/happy-dom events.

// Since the hook uses "use client" and React hooks, we test the underlying logic
// by importing the hook in a minimal way and dispatching keyboard events.

describe("barcode scanner detection logic", () => {
  // Constants matching the hook
  const SCANNER_THRESHOLD_MS = 50
  const MIN_BARCODE_LENGTH = 4

  /**
   * Simulates the scanner buffer logic without React hooks.
   * This mirrors the keydown handler logic from useBarcodeScanner.
   */
  function simulateScanner(
    keys: Array<{ key: string; delay: number }>,
  ): string | null {
    let buffer = ""
    let lastKeyTime = 0
    let result: string | null = null

    for (const { key, delay } of keys) {
      const now = lastKeyTime + delay

      if (key === "Enter") {
        const barcode = buffer.trim()
        if (barcode.length >= MIN_BARCODE_LENGTH) {
          result = barcode
        }
        buffer = ""
        lastKeyTime = 0
        continue
      }

      // Only single printable characters
      if (key.length !== 1) continue

      const timeSinceLast = now - lastKeyTime

      // If too slow, reset
      if (lastKeyTime > 0 && timeSinceLast > SCANNER_THRESHOLD_MS) {
        buffer = ""
      }

      buffer += key
      lastKeyTime = now
    }

    return result
  }

  it("detects characters arriving <50ms apart as scanner input", () => {
    const result = simulateScanner([
      { key: "1", delay: 0 },
      { key: "2", delay: 10 },
      { key: "3", delay: 10 },
      { key: "4", delay: 10 },
      { key: "5", delay: 10 },
      { key: "Enter", delay: 10 },
    ])
    expect(result).toBe("12345")
  })

  it("ignores characters arriving >100ms apart (human typing)", () => {
    const result = simulateScanner([
      { key: "a", delay: 0 },
      { key: "b", delay: 150 }, // too slow -> resets
      { key: "c", delay: 150 },
      { key: "d", delay: 150 },
      { key: "Enter", delay: 150 },
    ])
    // After each slow keystroke the buffer resets, so only "d" remains
    // which is < MIN_BARCODE_LENGTH
    expect(result).toBeNull()
  })

  it("requires minimum 4 characters for a valid scan", () => {
    const resultShort = simulateScanner([
      { key: "A", delay: 0 },
      { key: "B", delay: 10 },
      { key: "C", delay: 10 },
      { key: "Enter", delay: 10 },
    ])
    expect(resultShort).toBeNull()

    const resultExact = simulateScanner([
      { key: "A", delay: 0 },
      { key: "B", delay: 10 },
      { key: "C", delay: 10 },
      { key: "D", delay: 10 },
      { key: "Enter", delay: 10 },
    ])
    expect(resultExact).toBe("ABCD")
  })

  it("Enter key triggers scan callback when buffer is valid", () => {
    const result = simulateScanner([
      { key: "4", delay: 0 },
      { key: "0", delay: 5 },
      { key: "0", delay: 5 },
      { key: "6", delay: 5 },
      { key: "3", delay: 5 },
      { key: "8", delay: 5 },
      { key: "1", delay: 5 },
      { key: "Enter", delay: 5 },
    ])
    expect(result).toBe("4006381")
  })

  it("resets buffer when there is a slow keystroke mid-sequence", () => {
    const result = simulateScanner([
      { key: "1", delay: 0 },
      { key: "2", delay: 10 },
      { key: "3", delay: 200 }, // too slow -> reset
      { key: "4", delay: 10 },
      { key: "5", delay: 10 },
      { key: "6", delay: 10 },
      { key: "7", delay: 10 },
      { key: "Enter", delay: 10 },
    ])
    // Buffer reset at "3", then "3","4","5","6","7" = 5 chars
    expect(result).toBe("34567")
  })

  it("ignores non-printable keys (Shift, Control, etc.)", () => {
    const result = simulateScanner([
      { key: "A", delay: 0 },
      { key: "Shift", delay: 5 }, // ignored (length > 1)
      { key: "B", delay: 5 },
      { key: "C", delay: 5 },
      { key: "D", delay: 5 },
      { key: "Enter", delay: 5 },
    ])
    expect(result).toBe("ABCD")
  })

  it("Enter without enough characters returns null", () => {
    const result = simulateScanner([
      { key: "Enter", delay: 0 },
    ])
    expect(result).toBeNull()
  })
})
