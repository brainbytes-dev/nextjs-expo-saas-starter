import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";
import type { QueuedAction } from "./offline-queue";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConflictResolution = "keep_mine" | "keep_server" | "merged";

export interface Conflict {
  /** Unique id — matches the queueId on the server response */
  id: string;
  queuedAction: QueuedAction;
  serverState: Record<string, unknown>;
  conflictFields: string[];
  resolution?: ConflictResolution;
  /** ISO timestamp when this conflict was detected */
  detectedAt: string;
}

export interface ConflictStoreState {
  conflicts: Conflict[];
  lastSyncAt: number | null;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const CONFLICTS_KEY = "@logistikapp/conflicts";
const LAST_SYNC_KEY = "@logistikapp/last_sync_at";

let conflicts: Conflict[] = [];
let lastSyncAt: number | null = null;

type ConflictListener = (state: ConflictStoreState) => void;
const conflictListeners = new Set<ConflictListener>();

function notifyConflictListeners() {
  const state: ConflictStoreState = {
    conflicts: [...conflicts],
    lastSyncAt,
  };
  for (const listener of conflictListeners) {
    listener(state);
  }
}

export async function loadConflicts(): Promise<void> {
  try {
    const [storedConflicts, storedSync] = await Promise.all([
      AsyncStorage.getItem(CONFLICTS_KEY),
      AsyncStorage.getItem(LAST_SYNC_KEY),
    ]);
    if (storedConflicts) conflicts = JSON.parse(storedConflicts);
    if (storedSync) lastSyncAt = JSON.parse(storedSync);
  } catch {}
}

async function persistConflicts(): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
  } catch {}
}

export async function persistLastSyncAt(ts: number): Promise<void> {
  lastSyncAt = ts;
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(ts));
  } catch {}
  notifyConflictListeners();
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

export function addConflicts(newConflicts: Conflict[]): void {
  // Deduplicate by id — a re-sync should replace existing conflicts, not append duplicates.
  const existingIds = new Set(conflicts.map((c) => c.id));
  const deduplicated = newConflicts.filter((c) => !existingIds.has(c.id));
  conflicts = [...conflicts, ...deduplicated];
  persistConflicts();
  notifyConflictListeners();
}

export function getConflicts(): Conflict[] {
  return [...conflicts];
}

export function getConflictCount(): number {
  return conflicts.filter((c) => !c.resolution).length;
}

export function getLastSyncAt(): number | null {
  return lastSyncAt;
}

/** Remove a single conflict after it has been resolved. */
export async function removeConflict(id: string): Promise<void> {
  conflicts = conflicts.filter((c) => c.id !== id);
  await persistConflicts();
  notifyConflictListeners();
}

export async function clearAllConflicts(): Promise<void> {
  conflicts = [];
  await persistConflicts();
  notifyConflictListeners();
}

// ── Conflict detection helper (called from offline-queue flush) ───────────────

/**
 * Build Conflict objects from the sync/resolve API response.
 * The caller is responsible for removing the corresponding queue items.
 */
export function buildConflicts(
  serverConflicts: Array<{
    queueId: string;
    clientChange: { path: string; method: string; body: Record<string, unknown>; clientTimestamp: number };
    serverState: Record<string, unknown>;
    conflictFields: string[];
  }>,
  queue: QueuedAction[]
): Conflict[] {
  const queueMap = new Map(queue.map((a) => [a.id, a]));
  return serverConflicts
    .map((sc) => {
      const action = queueMap.get(sc.queueId);
      if (!action) return null;
      return {
        id: sc.queueId,
        queuedAction: action,
        serverState: sc.serverState,
        conflictFields: sc.conflictFields,
        detectedAt: new Date().toISOString(),
      } satisfies Conflict;
    })
    .filter((c): c is Conflict => c !== null);
}

// ── Resolution logic ──────────────────────────────────────────────────────────

/**
 * Apply a conflict resolution:
 * - "keep_mine"   → POST the client's original queued body to the server
 * - "keep_server" → discard the queued change (server state is canonical)
 * - "merged"      → apply the mergedBody provided by the caller
 */
export async function resolveConflict(
  conflict: Conflict,
  resolution: ConflictResolution,
  mergedBody?: Record<string, unknown>
): Promise<void> {
  const { apiFetch } = await import("./api");

  if (resolution === "keep_mine") {
    await apiFetch(conflict.queuedAction.path, {
      method: conflict.queuedAction.method,
      body: JSON.stringify(conflict.queuedAction.body),
    });
  } else if (resolution === "merged" && mergedBody) {
    await apiFetch(conflict.queuedAction.path, {
      method: conflict.queuedAction.method,
      body: JSON.stringify(mergedBody),
    });
  }
  // "keep_server" — no network call, just discard

  await removeConflict(conflict.id);
}

/**
 * Resolve all unresolved conflicts using the "keep_server" strategy.
 * This is the batch discard action.
 */
export async function resolveAllKeepServer(): Promise<void> {
  const unresolved = conflicts.filter((c) => !c.resolution);
  for (const conflict of unresolved) {
    await removeConflict(conflict.id);
  }
}

/**
 * Resolve all unresolved conflicts using the "keep_mine" strategy.
 * Sequentially applies each queued change to the server, forcing an overwrite.
 */
export async function resolveAllKeepMine(): Promise<void> {
  const unresolved = [...conflicts.filter((c) => !c.resolution)];
  for (const conflict of unresolved) {
    await resolveConflict(conflict, "keep_mine");
  }
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useConflicts(): ConflictStoreState & { unresolvedCount: number } {
  const [state, setState] = useState<ConflictStoreState>({
    conflicts: [...conflicts],
    lastSyncAt,
  });

  useEffect(() => {
    const listener: ConflictListener = (s) => setState(s);
    conflictListeners.add(listener);
    return () => {
      conflictListeners.delete(listener);
    };
  }, []);

  const unresolvedCount = state.conflicts.filter((c) => !c.resolution).length;
  return { ...state, unresolvedCount };
}

// Load persisted data on module init
loadConflicts();
