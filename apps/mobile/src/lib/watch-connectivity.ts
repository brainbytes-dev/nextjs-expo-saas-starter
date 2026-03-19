/**
 * Apple Watch connectivity bridge layer.
 *
 * This module provides the React Native side of the WatchConnectivity bridge.
 * The actual watchOS companion app must be built natively in Swift/SwiftUI and
 * added to the Xcode project. This layer handles message passing between the
 * phone app and the watch app via the WatchConnectivity framework.
 *
 * Until `react-native-watch-connectivity` is installed, all functions operate
 * as safe no-ops that log warnings, so the rest of the app can reference them
 * without crashing.
 */

import { Platform } from "react-native";

// ── Types ───────────────────────────────────────────────────────────────

export interface WatchMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type WatchActionType =
  | "scan_result"
  | "timer_start"
  | "timer_stop"
  | "checkin"
  | "checkout"
  | "request_sync";

export interface WatchAction {
  type: WatchActionType;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface ToolBooking {
  id: string;
  toolName: string;
  toolBarcode: string;
  checkedOutAt: string;
  dueAt?: string;
  userName: string;
}

export interface ActiveTimer {
  id: string;
  label: string;
  startedAt: string;
  elapsedSeconds: number;
  isRunning: boolean;
}

export interface WatchSyncPayload {
  toolBookings: ToolBooking[];
  activeTimer: ActiveTimer | null;
  stats: {
    materialsCount: number;
    pendingTasks: number;
    overdueTools: number;
  };
  lastSyncedAt: string;
}

export type WatchMessageCallback = (message: WatchMessage) => void;
export type WatchActionCallback = (action: WatchAction) => void;

// ── State ───────────────────────────────────────────────────────────────

let isReachable = false;
let isPaired = false;
let isInstalled = false;
let watchLib: typeof import("react-native-watch-connectivity") | null = null;
const actionListeners = new Set<WatchActionCallback>();
const messageListeners = new Set<WatchMessageCallback>();

// ── Initialisation ──────────────────────────────────────────────────────

/**
 * Attempt to load the native watch connectivity module.
 * Returns `true` if the module is available and we're on iOS.
 */
function loadNativeModule(): boolean {
  if (Platform.OS !== "ios") return false;

  if (watchLib !== null) return true;

  try {
    // Dynamic require so the app doesn't crash if the native module isn't linked
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    watchLib = require("react-native-watch-connectivity");
    return true;
  } catch {
    console.warn(
      "[WatchConnectivity] react-native-watch-connectivity nicht installiert. " +
        "Watch-Funktionen sind deaktiviert."
    );
    return false;
  }
}

/**
 * Initialise watch connectivity listeners.
 * Call once on app startup (e.g. in the root layout).
 */
export function initWatchConnectivity(): () => void {
  if (!loadNativeModule() || !watchLib) {
    return () => {};
  }

  const subscriptions: Array<{ remove?: () => void }> = [];

  try {
    // Watch reachability
    const reachSub = watchLib.watchEvents.addListener(
      "reachability",
      (reachability: boolean) => {
        isReachable = reachability;
      }
    );
    subscriptions.push(reachSub);

    // Pairing status
    const pairedSub = watchLib.watchEvents.addListener(
      "paired",
      (paired: boolean) => {
        isPaired = paired;
      }
    );
    subscriptions.push(pairedSub);

    // Installed status
    const installedSub = watchLib.watchEvents.addListener(
      "installed",
      (installed: boolean) => {
        isInstalled = installed;
      }
    );
    subscriptions.push(installedSub);

    // Incoming messages from watch
    const messageSub = watchLib.watchEvents.addListener(
      "message",
      (message: Record<string, unknown>) => {
        const watchMsg: WatchMessage = {
          type: (message.type as string) ?? "unknown",
          payload: message,
          timestamp: Date.now(),
        };

        // Notify generic listeners
        for (const listener of messageListeners) {
          listener(watchMsg);
        }

        // Parse as action if it has the right shape
        if (message.type && isWatchActionType(message.type as string)) {
          const action: WatchAction = {
            type: message.type as WatchActionType,
            data: (message.data as Record<string, unknown>) ?? {},
            timestamp: Date.now(),
          };
          for (const listener of actionListeners) {
            listener(action);
          }
        }
      }
    );
    subscriptions.push(messageSub);
  } catch (e) {
    console.warn("[WatchConnectivity] Fehler bei Initialisierung:", e);
  }

  // Return cleanup function
  return () => {
    for (const sub of subscriptions) {
      sub.remove?.();
    }
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Send a message to the Apple Watch. Falls back to `updateApplicationContext`
 * if the watch is not immediately reachable (context will be delivered when
 * the watch wakes up).
 */
export async function sendMessageToWatch(
  message: Record<string, unknown>
): Promise<boolean> {
  if (!loadNativeModule() || !watchLib) {
    console.warn("[WatchConnectivity] Modul nicht verfügbar");
    return false;
  }

  const payload: WatchMessage = {
    type: (message.type as string) ?? "data",
    payload: message,
    timestamp: Date.now(),
  };

  try {
    if (isReachable) {
      await watchLib.sendMessage(payload as any);
    } else {
      // Context transfer — delivered when watch becomes reachable
      await watchLib.updateApplicationContext(payload as any);
    }
    return true;
  } catch (e) {
    console.warn("[WatchConnectivity] Nachricht konnte nicht gesendet werden:", e);
    return false;
  }
}

/**
 * Register a callback for incoming watch messages.
 * Returns an unsubscribe function.
 */
export function setupWatchListener(callback: WatchMessageCallback): () => void {
  messageListeners.add(callback);
  return () => {
    messageListeners.delete(callback);
  };
}

/**
 * Register a callback for structured watch actions (scan, timer, check-in/out).
 * Returns an unsubscribe function.
 */
export function onWatchAction(callback: WatchActionCallback): () => void {
  actionListeners.add(callback);
  return () => {
    actionListeners.delete(callback);
  };
}

/**
 * Sync current tool bookings to the watch.
 */
export async function syncToolBookings(
  bookings: ToolBooking[]
): Promise<boolean> {
  return sendMessageToWatch({
    type: "sync_bookings",
    bookings,
    count: bookings.length,
  });
}

/**
 * Sync active time-tracking timer to the watch.
 */
export async function syncActiveTimer(
  timer: ActiveTimer | null
): Promise<boolean> {
  return sendMessageToWatch({
    type: "sync_timer",
    timer,
    isRunning: timer?.isRunning ?? false,
  });
}

/**
 * Send full sync payload (bookings + timer + stats) to the watch.
 */
export async function syncFullPayload(
  payload: WatchSyncPayload
): Promise<boolean> {
  return sendMessageToWatch({
    type: "full_sync",
    ...payload,
  });
}

/**
 * Process an incoming action from the watch and route it.
 */
export function handleWatchAction(
  action: WatchAction,
  handlers: Partial<Record<WatchActionType, (data?: Record<string, unknown>) => void>>
): void {
  const handler = handlers[action.type];
  if (handler) {
    handler(action.data);
  } else {
    console.warn(
      `[WatchConnectivity] Kein Handler für Watch-Aktion: ${action.type}`
    );
  }
}

// ── Status Queries ──────────────────────────────────────────────────────

export function getWatchStatus() {
  return {
    isPaired,
    isInstalled,
    isReachable,
    isSupported: Platform.OS === "ios",
    isModuleAvailable: watchLib !== null,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

const VALID_ACTIONS: WatchActionType[] = [
  "scan_result",
  "timer_start",
  "timer_stop",
  "checkin",
  "checkout",
  "request_sync",
];

function isWatchActionType(type: string): type is WatchActionType {
  return VALID_ACTIONS.includes(type as WatchActionType);
}
