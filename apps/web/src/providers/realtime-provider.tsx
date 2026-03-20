"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { getPresenceChannel, removeChannel } from "@/lib/realtime"
import type { RealtimeChannel } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface OnlineUser {
  id: string
  name: string
  page: string
  avatar?: string
}

interface RealtimeContextValue {
  onlineUsers: OnlineUser[]
  isConnected: boolean
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const RealtimeContext = createContext<RealtimeContextValue>({
  onlineUsers: [],
  isConnected: false,
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

// Default org id when none is available
const DEFAULT_ORG = "default"

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const orgIdRef = useRef(DEFAULT_ORG)

  // Derive a stable orgId — we use "default" when not resolved yet
  // This avoids re-subscribing on every render
  const orgId = DEFAULT_ORG

  // ── Presence subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return

    const user = session.user
    orgIdRef.current = orgId

    let mounted = true

    try {
      const channel = getPresenceChannel(orgId)
      if (!channel) return

      channelRef.current = channel

      channel
        .on("presence", { event: "sync" }, () => {
          if (!mounted) return
          const state = channel.presenceState<{
            id: string
            name: string
            page: string
            avatar?: string
          }>()

          const users: OnlineUser[] = []
          const seen = new Set<string>()

          for (const presences of Object.values(state)) {
            for (const p of presences) {
              if (!seen.has(p.id)) {
                seen.add(p.id)
                users.push({
                  id: p.id,
                  name: p.name,
                  page: p.page,
                  avatar: p.avatar,
                })
              }
            }
          }
          setOnlineUsers(users)
        })
        .subscribe(async (status) => {
          if (!mounted) return
          if (status === "SUBSCRIBED") {
            setIsConnected(true)
            await channel.track({
              id: user.id,
              name: user.name ?? user.email ?? "Unbekannt",
              page: pathname,
              avatar: user.image ?? undefined,
            })
          }
        })
    } catch {
      // Supabase Realtime not available — graceful degradation
      if (mounted) setIsConnected(false)
    }

    return () => {
      mounted = false
      try {
        removeChannel(orgIdRef.current, "presence")
      } catch {
        // ignore cleanup errors
      }
      channelRef.current = null
      setIsConnected(false)
      setOnlineUsers([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, orgId])

  // ── Update current page on route change ──────────────────────────────────
  const updatePage = useCallback(async () => {
    const channel = channelRef.current
    const user = session?.user
    if (!channel || !user) return

    try {
      await channel.track({
        id: user.id,
        name: user.name ?? user.email ?? "Unbekannt",
        page: pathname,
        avatar: user.image ?? undefined,
      })
    } catch {
      // non-critical
    }
  }, [session?.user, pathname])

  useEffect(() => {
    if (isConnected) {
      void updatePage()
    }
  }, [pathname, isConnected, updatePage])

  return (
    <RealtimeContext.Provider value={{ onlineUsers, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  )
}
