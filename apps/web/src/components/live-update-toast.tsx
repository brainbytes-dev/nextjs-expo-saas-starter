"use client"

import { toast } from "sonner"

type ChangeType = "eingebucht" | "ausgebucht"

/**
 * Show a toast notification for a live stock change.
 *
 * Usage:
 *   showStockChangeToast("Max Müller", 5, "Schrauben M6", "eingebucht")
 */
export function showStockChangeToast(
  userName: string,
  quantity: number,
  materialName: string,
  changeType: ChangeType
) {
  toast(`${userName} hat ${quantity}x ${materialName} ${changeType}`, {
    duration: 5000,
    icon: changeType === "eingebucht" ? "\u{1F4E6}" : "\u{1F4E4}",
  })
}

/**
 * Show a generic live-update toast
 */
export function showLiveUpdateToast(message: string) {
  toast(message, {
    duration: 5000,
  })
}
