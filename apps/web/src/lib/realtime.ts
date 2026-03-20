import { getSupabaseClient } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

/**
 * Supabase Realtime helpers
 * Graceful degradation: all functions return null if Supabase is unavailable
 */

const channelCache = new Map<string, RealtimeChannel>()

/**
 * Get or create a Realtime channel for an org
 */
export function getRealtimeChannel(
  orgId: string,
  channelName: string
): RealtimeChannel | null {
  const client = getSupabaseClient()
  if (!client) return null

  const key = `org:${orgId}:${channelName}`
  const cached = channelCache.get(key)
  if (cached) return cached

  const channel = client.channel(key)
  channelCache.set(key, channel)
  return channel
}

/**
 * Get or create a Presence channel for tracking online users
 */
export function getPresenceChannel(orgId: string): RealtimeChannel | null {
  return getRealtimeChannel(orgId, "presence")
}

/**
 * Subscribe to Postgres changes on a table, scoped to an org
 */
export function subscribeToTable(
  orgId: string,
  table: string,
  callback: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE"
    new: Record<string, unknown>
    old: Record<string, unknown>
  }) => void
): RealtimeChannel | null {
  const client = getSupabaseClient()
  if (!client) return null

  const key = `org:${orgId}:table:${table}`
  const existing = channelCache.get(key)
  if (existing) return existing

  const channel = client
    .channel(key)
    .on(
      "postgres_changes" as never,
      {
        event: "*",
        schema: "public",
        table,
        filter: `org_id=eq.${orgId}`,
      } as never,
      (payload: Record<string, unknown>) => {
        callback({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          new: (payload.new as Record<string, unknown>) ?? {},
          old: (payload.old as Record<string, unknown>) ?? {},
        })
      }
    )
    .subscribe()

  channelCache.set(key, channel)
  return channel
}

/**
 * Remove a channel from cache and unsubscribe
 */
export function removeChannel(orgId: string, channelName: string): void {
  const client = getSupabaseClient()
  const key = `org:${orgId}:${channelName}`
  const channel = channelCache.get(key)

  if (channel && client) {
    client.removeChannel(channel)
  }
  channelCache.delete(key)
}
