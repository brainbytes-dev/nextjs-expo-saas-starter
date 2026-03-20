"use client"

import { useMemo } from "react"
import { useRealtime } from "@/providers/realtime-provider"
import type { OnlineUser } from "@/providers/realtime-provider"

/**
 * Hook that returns the list of currently online users and count
 */
export function usePresence(): {
  onlineUsers: OnlineUser[]
  count: number
} {
  const { onlineUsers } = useRealtime()

  return useMemo(
    () => ({
      onlineUsers,
      count: onlineUsers.length,
    }),
    [onlineUsers]
  )
}
