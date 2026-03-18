import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";
import { isOnline, onConnectivityChange } from "./connectivity";

const QUEUE_KEY = "@logistikapp/offline_queue";

export interface QueuedAction {
  id: string;
  type: "stock-change" | "tool-booking" | "commission-update" | "commission-entry";
  method: "POST" | "PATCH";
  path: string;
  body: Record<string, unknown>;
  /** Unix timestamp (ms) when the action was enqueued — used for conflict detection */
  clientTimestamp: number;
  createdAt: number;
  retryCount: number;
}

type QueueListener = (queue: QueuedAction[]) => void;
let queue: QueuedAction[] = [];
const queueListeners = new Set<QueueListener>();
let flushing = false;

function notifyQueueListeners() {
  for (const listener of queueListeners) {
    listener([...queue]);
  }
}

export async function loadQueue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) queue = JSON.parse(stored);
  } catch {}
}

async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function enqueue(
  action: Omit<QueuedAction, "id" | "createdAt" | "retryCount" | "clientTimestamp">
): Promise<void> {
  const now = Date.now();
  const item: QueuedAction = {
    ...action,
    id: `q_${now}_${Math.random().toString(36).slice(2, 8)}`,
    clientTimestamp: now,
    createdAt: now,
    retryCount: 0,
  };
  queue.push(item);
  await persistQueue();
  notifyQueueListeners();
}

export function getQueue(): QueuedAction[] {
  return [...queue];
}

export function getPendingCount(): number {
  return queue.length;
}

/** Remove a specific queue item by id — used after conflict resolution */
export async function removeFromQueue(id: string): Promise<void> {
  queue = queue.filter((item) => item.id !== id);
  await persistQueue();
  notifyQueueListeners();
}

export async function flushQueue(): Promise<void> {
  if (flushing || queue.length === 0 || !isOnline()) return;
  flushing = true;

  try {
    await _flushWithConflictDetection();
  } finally {
    flushing = false;
  }
}

async function _flushWithConflictDetection(): Promise<void> {
  // Import lazily to avoid circular dependencies
  const { apiFetch } = await import("./api");
  const {
    buildConflicts,
    addConflicts,
    persistLastSyncAt,
  } = await import("./conflict-resolver");

  // Batch all queued actions to the sync/resolve endpoint first so the server
  // can detect conflicts before we blindly apply changes.
  const batch = [...queue];

  let syncResponse: {
    resolved: Array<{ queueId: string; status: number }>;
    conflicts: Array<{
      queueId: string;
      clientChange: {
        path: string;
        method: string;
        body: Record<string, unknown>;
        clientTimestamp: number;
      };
      serverState: Record<string, unknown>;
      conflictFields: string[];
    }>;
  } | null = null;

  try {
    syncResponse = await apiFetch<typeof syncResponse>("/api/sync/resolve", {
      method: "POST",
      body: JSON.stringify({
        changes: batch.map((item) => ({
          queueId: item.id,
          path: item.path,
          method: item.method,
          body: item.body,
          clientTimestamp: item.clientTimestamp,
        })),
      }),
    });
  } catch {
    // Sync endpoint unavailable — fall through to legacy sequential mode
  }

  if (syncResponse) {
    // Remove resolved items from the queue
    const resolvedIds = new Set(
      syncResponse.resolved
        .filter((r) => r.status < 500)
        .map((r) => r.queueId)
    );
    // Also remove conflict items — they are now tracked in the conflict store
    const conflictIds = new Set(syncResponse.conflicts.map((c) => c.queueId));

    queue = queue.filter(
      (item) => !resolvedIds.has(item.id) && !conflictIds.has(item.id)
    );
    await persistQueue();
    notifyQueueListeners();

    // Register detected conflicts
    if (syncResponse.conflicts.length > 0) {
      const newConflicts = buildConflicts(syncResponse.conflicts, batch);
      addConflicts(newConflicts);
    }

    await persistLastSyncAt(Date.now());
    return;
  }

  // ── Legacy fallback: apply sequentially ─────────────────────────────────────
  while (queue.length > 0 && isOnline()) {
    const item = queue[0]!;
    try {
      await apiFetch(item.path, {
        method: item.method,
        body: JSON.stringify(item.body),
      });
      queue.shift();
      await persistQueue();
      notifyQueueListeners();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status !== undefined && status >= 400 && status < 500) {
        // Client error — discard (dead letter)
        console.warn(
          `[offline-queue] Discarding action ${item.id} (${status}):`,
          item
        );
        queue.shift();
        await persistQueue();
        notifyQueueListeners();
      } else {
        // Network or server error — stop flushing, retry later
        item.retryCount++;
        await persistQueue();
        break;
      }
    }
  }

  await persistLastSyncAt(Date.now());
}

export async function clearQueue(): Promise<void> {
  queue = [];
  await persistQueue();
  notifyQueueListeners();
}

export function useQueue(): { queue: QueuedAction[]; pendingCount: number } {
  const [state, setState] = useState<QueuedAction[]>([...queue]);
  useEffect(() => {
    const listener: QueueListener = (q) => setState(q);
    queueListeners.add(listener);
    return () => {
      queueListeners.delete(listener);
    };
  }, []);
  return { queue: state, pendingCount: state.length };
}

// Auto-flush on reconnect
onConnectivityChange((online) => {
  if (online) {
    flushQueue();
  }
});

// Load queue on module init
loadQueue();
