/**
 * React hook for Apple Watch synchronisation.
 *
 * Automatically syncs relevant app data (tool bookings, active timer, quick
 * stats) to the watch whenever the app state changes. Also listens for
 * incoming watch actions (barcode scan, timer toggle, quick check-in/out)
 * and exposes them via callback props.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  initWatchConnectivity,
  getWatchStatus,
  syncFullPayload,
  syncToolBookings,
  syncActiveTimer,
  onWatchAction,
  handleWatchAction,
  type WatchAction,
  type WatchActionType,
  type ToolBooking,
  type ActiveTimer,
  type WatchSyncPayload,
} from "@/lib/watch-connectivity";

// ── Types ───────────────────────────────────────────────────────────────

export interface WatchSyncState {
  /** Whether an Apple Watch is paired with this device. */
  isPaired: boolean;
  /** Whether the LogistikApp watch app is installed. */
  isInstalled: boolean;
  /** Whether the watch is currently reachable (in range & awake). */
  isReachable: boolean;
  /** Whether the current platform supports Watch connectivity at all. */
  isSupported: boolean;
  /** ISO timestamp of the last successful sync to the watch. */
  lastSyncedAt: string | null;
  /** Whether a sync is currently in progress. */
  isSyncing: boolean;
  /** Error message from the last failed sync, or null. */
  lastError: string | null;
}

export interface UseWatchSyncOptions {
  /** Current tool bookings to sync. */
  toolBookings?: ToolBooking[];
  /** Current active timer to sync. */
  activeTimer?: ActiveTimer | null;
  /** Quick stats for the watch glance. */
  stats?: {
    materialsCount: number;
    pendingTasks: number;
    overdueTools: number;
  };
  /** Called when the watch sends a barcode scan result. */
  onScanResult?: (barcode: string) => void;
  /** Called when the watch requests a timer start. */
  onTimerStart?: () => void;
  /** Called when the watch requests a timer stop. */
  onTimerStop?: () => void;
  /** Called when the watch requests a quick check-in. */
  onCheckin?: (data?: Record<string, unknown>) => void;
  /** Called when the watch requests a quick check-out. */
  onCheckout?: (data?: Record<string, unknown>) => void;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useWatchSync(options: UseWatchSyncOptions = {}) {
  const {
    toolBookings = [],
    activeTimer = null,
    stats = { materialsCount: 0, pendingTasks: 0, overdueTools: 0 },
    onScanResult,
    onTimerStart,
    onTimerStop,
    onCheckin,
    onCheckout,
  } = options;

  const [state, setState] = useState<WatchSyncState>(() => {
    const status = getWatchStatus();
    return {
      isPaired: status.isPaired,
      isInstalled: status.isInstalled,
      isReachable: status.isReachable,
      isSupported: status.isSupported,
      lastSyncedAt: null,
      isSyncing: false,
      lastError: null,
    };
  });

  // Keep a ref to the latest callbacks so we don't re-subscribe on every render
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // ── Initialise connectivity on mount ──────────────────────────────────

  useEffect(() => {
    const cleanup = initWatchConnectivity();

    // Poll status once after init settles
    const timer = setTimeout(() => {
      const status = getWatchStatus();
      setState((prev) => ({
        ...prev,
        isPaired: status.isPaired,
        isInstalled: status.isInstalled,
        isReachable: status.isReachable,
        isSupported: status.isSupported,
      }));
    }, 500);

    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, []);

  // ── Listen for watch actions ──────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onWatchAction((action: WatchAction) => {
      // Update reachability — if we got a message, watch is reachable
      setState((prev) => ({ ...prev, isReachable: true }));

      const handlers: Partial<
        Record<WatchActionType, (data?: Record<string, unknown>) => void>
      > = {
        scan_result: (data) => {
          const barcode = data?.barcode as string;
          if (barcode) callbacksRef.current.onScanResult?.(barcode);
        },
        timer_start: () => callbacksRef.current.onTimerStart?.(),
        timer_stop: () => callbacksRef.current.onTimerStop?.(),
        checkin: (data) => callbacksRef.current.onCheckin?.(data),
        checkout: (data) => callbacksRef.current.onCheckout?.(data),
        request_sync: () => {
          // Watch explicitly requested a sync — trigger it
          triggerSync();
        },
      };

      handleWatchAction(action, handlers);
    });

    return unsubscribe;
  }, []);

  // ── Sync data to watch ────────────────────────────────────────────────

  const triggerSync = useCallback(async () => {
    const status = getWatchStatus();
    if (!status.isSupported || !status.isModuleAvailable) return;

    setState((prev) => ({ ...prev, isSyncing: true, lastError: null }));

    try {
      const payload: WatchSyncPayload = {
        toolBookings,
        activeTimer,
        stats,
        lastSyncedAt: new Date().toISOString(),
      };

      const success = await syncFullPayload(payload);

      if (success) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString(),
          isReachable: true,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastError: "Sync fehlgeschlagen",
        }));
      }
    } catch (e) {
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastError:
          e instanceof Error ? e.message : "Unbekannter Fehler beim Sync",
      }));
    }
  }, [toolBookings, activeTimer, stats]);

  // ── Auto-sync when app comes to foreground ────────────────────────────

  useEffect(() => {
    function handleAppState(nextState: AppStateStatus) {
      if (nextState === "active") {
        // Refresh watch status
        const status = getWatchStatus();
        setState((prev) => ({
          ...prev,
          isPaired: status.isPaired,
          isInstalled: status.isInstalled,
          isReachable: status.isReachable,
        }));

        // Auto-sync
        triggerSync();
      }
    }

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [triggerSync]);

  // ── Auto-sync when bookings or timer change ───────────────────────────

  useEffect(() => {
    // Debounce to avoid flooding the watch with updates
    const timer = setTimeout(() => {
      syncToolBookings(toolBookings);
    }, 1000);
    return () => clearTimeout(timer);
  }, [toolBookings]);

  useEffect(() => {
    syncActiveTimer(activeTimer);
  }, [activeTimer]);

  // ── Public interface ──────────────────────────────────────────────────

  return {
    ...state,
    /** Manually trigger a full sync to the watch. */
    syncNow: triggerSync,
    /** Refresh the watch connection status. */
    refreshStatus: useCallback(() => {
      const status = getWatchStatus();
      setState((prev) => ({
        ...prev,
        isPaired: status.isPaired,
        isInstalled: status.isInstalled,
        isReachable: status.isReachable,
        isSupported: status.isSupported,
      }));
    }, []),
  };
}
