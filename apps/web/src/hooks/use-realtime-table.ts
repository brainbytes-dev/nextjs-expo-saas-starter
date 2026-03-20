"use client"

import { useEffect, useRef } from "react"
import { subscribeToTable, removeChannel } from "@/lib/realtime"

/**
 * Subscribe to Postgres changes for a specific table scoped to an org.
 *
 * @param tableName  - Postgres table name
 * @param orgId      - Organisation ID for row-level filtering
 * @param onInsert   - Callback for INSERT events
 * @param onUpdate   - Callback for UPDATE events
 * @param onDelete   - Callback for DELETE events
 */
export function useRealtimeTable(
  tableName: string,
  orgId: string | null | undefined,
  onInsert?: (record: Record<string, unknown>) => void,
  onUpdate?: (record: Record<string, unknown>, old: Record<string, unknown>) => void,
  onDelete?: (old: Record<string, unknown>) => void
): void {
  // Keep latest callbacks in refs so we don't re-subscribe on every render
  const insertRef = useRef(onInsert)
  const updateRef = useRef(onUpdate)
  const deleteRef = useRef(onDelete)

  useEffect(() => {
    insertRef.current = onInsert
    updateRef.current = onUpdate
    deleteRef.current = onDelete
  })

  useEffect(() => {
    if (!orgId || !tableName) return

    try {
      subscribeToTable(orgId, tableName, (payload) => {
        switch (payload.eventType) {
          case "INSERT":
            insertRef.current?.(payload.new)
            break
          case "UPDATE":
            updateRef.current?.(payload.new, payload.old)
            break
          case "DELETE":
            deleteRef.current?.(payload.old)
            break
        }
      })
    } catch {
      // Supabase Realtime not available — fail silently
    }

    return () => {
      try {
        removeChannel(orgId, `table:${tableName}`)
      } catch {
        // ignore
      }
    }
  }, [orgId, tableName])
}
