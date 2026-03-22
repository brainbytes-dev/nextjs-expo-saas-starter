"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  IconScale,
  IconBluetooth,
  IconBluetoothConnected,
  IconBluetoothOff,
  IconCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"
import {
  type WeightReading,
  isBluetoothAvailable,
  connectScale,
  disconnectScale,
  onWeightChange,
  onDisconnect,
  readWeight,
} from "@/lib/bluetooth-scale"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// ScaleWidget — live weight display from a BLE scale
// ---------------------------------------------------------------------------

interface ScaleWidgetProps {
  /** Called when user clicks "Gewicht übernehmen" */
  onApplyWeight?: (value: number, unit: string) => void
  /** Additional class name */
  className?: string
  /** Compact mode — smaller footprint */
  compact?: boolean
}

export function ScaleWidget({
  onApplyWeight,
  className,
  compact = false,
}: ScaleWidgetProps) {
  const t = useTranslations("scale")
  const [device, setDevice] = useState<BluetoothDevice | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [reading, setReading] = useState<WeightReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const btAvailable = isBluetoothAvailable()

  // ── Connect ─────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const dev = await connectScale()
      setDevice(dev)
      setConnected(true)

      // Subscribe to weight changes
      const unsub = await onWeightChange(dev, (r) => {
        setReading(r)
      })
      unsubscribeRef.current = unsub

      // Listen for disconnection
      onDisconnect(dev, () => {
        setConnected(false)
        setDevice(null)
        setReading(null)
        unsubscribeRef.current = null
      })

      // Try an initial read
      try {
        const initial = await readWeight(dev)
        setReading(initial)
      } catch {
        // Notifications will update the value
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("connectionError"))
      setDevice(null)
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }, [])

  // ── Disconnect ──────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    if (device) {
      disconnectScale(device)
    }
    setDevice(null)
    setConnected(false)
    setReading(null)
    setError(null)
  }, [device])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current()
    }
  }, [])

  // ── Apply weight ────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (reading && onApplyWeight) {
      onApplyWeight(reading.value, reading.unit)
      setApplied(true)
      setTimeout(() => setApplied(false), 2000)
    }
  }, [reading, onApplyWeight])

  // ── No Bluetooth ────────────────────────────────────────────────────────
  if (!btAvailable) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-muted-foreground/25 p-4",
          className
        )}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconBluetoothOff className="size-4" />
          <span>
            {t("bluetoothUnavailable")}
          </span>
        </div>
      </div>
    )
  }

  // ── Not connected ───────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-muted-foreground/25",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <IconScale
            className={cn(
              "text-muted-foreground",
              compact ? "size-6" : "size-8"
            )}
          />
          {!compact && (
            <p className="text-sm text-muted-foreground">
              {t("connectScale")}
            </p>
          )}
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                {t("connecting")}
              </>
            ) : (
              <>
                <IconBluetooth className="mr-1.5 size-4" />
                {t("connect")}
              </>
            )}
          </Button>
          {error && (
            <p className="text-center text-xs text-destructive">{error}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Connected — show weight ─────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBluetoothConnected className="size-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {device?.name || "Bluetooth-Waage"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={t("disconnect")}
        >
          <IconX className="size-3.5" />
        </button>
      </div>

      {/* Weight display */}
      <div className="mb-3 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={cn(
              "font-mono font-bold tabular-nums",
              compact ? "text-3xl" : "text-4xl"
            )}
          >
            {reading ? reading.value.toFixed(2) : "---"}
          </span>
          <span className="text-lg font-medium text-muted-foreground">
            {reading?.unit || "kg"}
          </span>
        </div>
        {reading && !reading.stable && (
          <p className="mt-1 text-xs text-amber-600">{t("measuring")}</p>
        )}
        {reading?.stable && (
          <p className="mt-1 text-xs text-green-600">{t("stable")}</p>
        )}
      </div>

      {/* Apply button */}
      {onApplyWeight && (
        <Button
          variant={applied ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={handleApply}
          disabled={!reading || !reading.stable || applied}
        >
          {applied ? (
            <>
              <IconCheck className="mr-1.5 size-4" />
              {t("applied")}
            </>
          ) : (
            <>
              <IconScale className="mr-1.5 size-4" />
              {t("applyWeight")}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
