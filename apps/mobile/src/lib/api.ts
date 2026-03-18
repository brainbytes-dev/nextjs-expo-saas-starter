import { getSession } from "./session-store";
import { getOrgId } from "./org-store";

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

async function apiFetch<T = unknown>(
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

export interface DashboardStats {
  materials: number;
  tools: number;
  keys: number;
  users: number;
  maxUsers: number;
  lowStockCount: number;
  expiringCount: number;
  overdueToolsCount: number;
}

export interface ScanResult {
  type: "material" | "tool" | "key" | null;
  item: Record<string, unknown> | null;
}

export interface Commission {
  id: string;
  name: string;
  number: number | null;
  manualNumber: string | null;
  status: string;
  notes: string | null;
  targetLocationId: string | null;
  targetLocationName: string | null;
  customerId: string | null;
  customerName: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionEntry {
  id: string;
  commissionId: string;
  materialId: string | null;
  materialName: string | null;
  materialNumber: string | null;
  materialUnit: string | null;
  toolId: string | null;
  toolName: string | null;
  toolNumber: string | null;
  quantity: number;
  pickedQuantity: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

export const getDashboardStats = () =>
  api.get<DashboardStats>("/api/dashboard/stats");

export const scanBarcode = (barcode: string) =>
  api.get<ScanResult>(`/api/scan?barcode=${encodeURIComponent(barcode)}`);

export const getCommissions = (statuses: string[] = ["open", "in_progress"]) => {
  const params = new URLSearchParams(statuses.map((s) => ["status", s])).toString();
  return api.get<{ data: Commission[] }>(`/api/commissions?${params}`);
};

export const createCommission = (body: { name: string; targetLocationId?: string; customerId?: string; notes?: string }) =>
  api.post<Commission>("/api/commissions", body);

export const getCommission = (id: string) =>
  api.get<Commission & { entryCount: number }>(`/api/commissions/${id}`);

export const updateCommission = (id: string, body: Partial<Pick<Commission, "status" | "name" | "notes">>) =>
  api.patch<Commission>(`/api/commissions/${id}`, body);

export const getCommissionEntries = (commissionId: string) =>
  api.get<{ data: CommissionEntry[] }>(`/api/commissions/${commissionId}/entries`);

export const addCommissionEntry = (
  commissionId: string,
  body: { materialId?: string; toolId?: string; quantity?: number; notes?: string }
) => api.post<CommissionEntry>(`/api/commissions/${commissionId}/entries`, body);

export const createStockChange = (body: {
  materialId: string;
  locationId: string;
  changeType: "in" | "out";
  quantity: number;
  notes?: string;
}) => api.post("/api/stock-changes", body);

export const createToolBooking = (
  toolId: string,
  body: { bookingType: "checkout" | "checkin"; toLocationId?: string; notes?: string }
) => api.post(`/api/tools/${toolId}/booking`, body);
