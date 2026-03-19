import { getSession } from "./session-store";
import { getOrgId } from "./org-store";
import { isDemoMode } from "./demo/config";
import * as demoApi from "./demo/api";
import { isOnline } from "./connectivity";
import { enqueue } from "./offline-queue";
import { withCache } from "./offline-cache";

const BASE_URL = process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const session = getSession();
  const orgId = getOrgId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(orgId ? { "x-organization-id": orgId } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, body || res.statusText);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const api = {
  get<T>(path: string): Promise<T> {
    return apiFetch<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: "DELETE" });
  },
};

export { ApiError };

// ── Typed API helpers ────────────────────────────────────────────────

// Types re-exported from api-types.ts to break circular dependency with demo/api.ts
export type {
  DashboardStats,
  ScanResult,
  Commission,
  CommissionEntry,
} from "./api-types";

import type {
  DashboardStats,
  ScanResult,
  Commission,
  CommissionEntry,
} from "./api-types";

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

const _getDashboardStats = () =>
  withCache<DashboardStats>(
    "dashboard_stats",
    () => api.get<DashboardStats>("/api/dashboard/stats"),
    ONE_HOUR_MS
  );

const _scanBarcode = (barcode: string) =>
  api.get<ScanResult>(`/api/scan?barcode=${encodeURIComponent(barcode)}`);

const _getCommissions = (statuses: string[] = ["open", "in_progress"]) => {
  const params = new URLSearchParams(statuses.map((s) => ["status", s])).toString();
  const cacheKey = `commissions_${statuses.sort().join("_")}`;
  return withCache<{ data: Commission[] }>(
    cacheKey,
    () => api.get<{ data: Commission[] }>(`/api/commissions?${params}`),
    THIRTY_MIN_MS
  );
};

const _createCommission = (body: {
  name: string;
  targetLocationId?: string;
  customerId?: string;
  notes?: string;
}) => api.post<Commission>("/api/commissions", body);

const _getCommission = (id: string) =>
  api.get<Commission & { entryCount: number }>(`/api/commissions/${id}`);

const _updateCommission = async (
  id: string,
  body: Partial<Pick<Commission, "status" | "name" | "notes">>
): Promise<Commission> => {
  if (!isOnline()) {
    await enqueue({
      type: "commission-update",
      method: "PATCH",
      path: `/api/commissions/${id}`,
      body: body as Record<string, unknown>,
    });
    // Return an optimistic stub so callers don't have to handle undefined
    return { id, ...body } as Commission;
  }
  return api.patch<Commission>(`/api/commissions/${id}`, body);
};

const _getCommissionEntries = (commissionId: string) =>
  api.get<{ data: CommissionEntry[] }>(
    `/api/commissions/${commissionId}/entries`
  );

const _addCommissionEntry = async (
  commissionId: string,
  body: {
    materialId?: string;
    toolId?: string;
    quantity?: number;
    notes?: string;
  }
): Promise<CommissionEntry> => {
  if (!isOnline()) {
    await enqueue({
      type: "commission-entry",
      method: "POST",
      path: `/api/commissions/${commissionId}/entries`,
      body: body as Record<string, unknown>,
    });
    return { commissionId, ...body } as unknown as CommissionEntry;
  }
  return api.post<CommissionEntry>(
    `/api/commissions/${commissionId}/entries`,
    body
  );
};

const _createStockChange = async (body: {
  materialId: string;
  locationId: string;
  changeType: "in" | "out";
  quantity: number;
  notes?: string;
}): Promise<void> => {
  if (!isOnline()) {
    await enqueue({
      type: "stock-change",
      method: "POST",
      path: "/api/stock-changes",
      body: body as Record<string, unknown>,
    });
    return;
  }
  return api.post("/api/stock-changes", body);
};

const _createToolBooking = async (
  toolId: string,
  body: {
    bookingType: "checkout" | "checkin";
    toLocationId?: string;
    notes?: string;
  }
): Promise<void> => {
  if (!isOnline()) {
    await enqueue({
      type: "tool-booking",
      method: "POST",
      path: `/api/tools/${toolId}/booking`,
      body: body as Record<string, unknown>,
    });
    return;
  }
  return api.post(`/api/tools/${toolId}/booking`, body);
};


const _eanLookup = (barcode: string) =>
  api.get<{
    found: boolean;
    barcode?: string;
    name?: string;
    manufacturer?: string;
    description?: string;
    imageUrl?: string;
    category?: string;
    source?: string;
  }>(`/api/ean-lookup?code=${encodeURIComponent(barcode)}`);

const _createMaterial = (body: {
  name: string;
  number?: string;
  unit?: string;
  barcode?: string;
  manufacturer?: string;
  notes?: string;
}) => api.post<{ id: string; name: string }>("/api/materials", body);

// ── Demo-mode conditional exports ────────────────────────────────────
export const getDashboardStats = isDemoMode
  ? demoApi.getDashboardStats
  : _getDashboardStats;
export const scanBarcode = isDemoMode ? demoApi.scanBarcode : _scanBarcode;
export const getCommissions = isDemoMode
  ? demoApi.getCommissions
  : _getCommissions;
export const createCommission = isDemoMode
  ? demoApi.createCommission
  : _createCommission;
export const getCommission = isDemoMode
  ? demoApi.getCommission
  : _getCommission;
export const updateCommission = isDemoMode
  ? demoApi.updateCommission
  : _updateCommission;
export const getCommissionEntries = isDemoMode
  ? demoApi.getCommissionEntries
  : _getCommissionEntries;
export const addCommissionEntry = isDemoMode
  ? demoApi.addCommissionEntry
  : _addCommissionEntry;
export const createStockChange = isDemoMode
  ? demoApi.createStockChange
  : _createStockChange;
export const createToolBooking = isDemoMode
  ? demoApi.createToolBooking
  : _createToolBooking;
export const eanLookup = isDemoMode ? demoApi.eanLookup : _eanLookup;
export const createMaterial = isDemoMode ? demoApi.createMaterial : _createMaterial;

// ── Batch stock change ────────────────────────────────────────────────

export interface BatchStockItem {
  materialId: string;
  locationId: string;
  changeType: "in" | "out";
  quantity: number;
  notes?: string;
}

const _batchStockChange = async (items: BatchStockItem[]): Promise<void> => {
  if (!isOnline()) {
    // Offline: enqueue each item individually so the existing queue
    // processor can drain them one-by-one when connectivity returns.
    await Promise.all(
      items.map((item) =>
        enqueue({
          type: "stock-change",
          method: "POST",
          path: "/api/stock-changes",
          body: item as Record<string, unknown>,
        })
      )
    );
    return;
  }
  return api.post("/api/stock-changes/batch", { items });
};

export const batchStockChange = isDemoMode
  ? async (items: BatchStockItem[]): Promise<void> => {
      console.warn("[demo] batchStockChange — no-op in demo mode", items);
    }
  : _batchStockChange;
