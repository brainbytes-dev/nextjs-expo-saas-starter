/**
 * Demo-mode implementations of every typed API helper exported from ../api.ts.
 * Each function returns a Promise that resolves after ~200ms to simulate network
 * latency. No real HTTP requests are made in demo mode.
 */

import {
  DEMO_DASHBOARD_STATS,
  DEMO_COMMISSIONS,
  DEMO_COMMISSION_ENTRIES,
  DEMO_SCAN_RESULT,
  DEMO_TIME_ENTRIES,
  DEMO_DELIVERIES,
  DEMO_WARRANTY_CLAIMS,
  DEMO_GEOFENCES,
  DEMO_GEOFENCE_EVENTS,
  DEMO_BLE_BEACONS,
} from "./data";

import type {
  DashboardStats,
  ScanResult,
  Commission,
  CommissionEntry,
  TimeEntry,
  DeliveryTracking,
  WarrantyClaim,
  Geofence,
  GeofenceEvent,
  BleBeacon,
} from "../api-types";

// ── Utility ───────────────────────────────────────────────────────────────────

function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function getDashboardStats(): Promise<DashboardStats> {
  return delay(DEMO_DASHBOARD_STATS);
}

// ── Barcode Scanner ───────────────────────────────────────────────────────────

export function scanBarcode(_barcode: string): Promise<ScanResult> {
  return delay(DEMO_SCAN_RESULT);
}

// ── Commissions ───────────────────────────────────────────────────────────────

export function getCommissions(
  statuses: string[] = ["open", "in_progress"]
): Promise<{ data: Commission[] }> {
  const filtered = DEMO_COMMISSIONS.filter((c) => statuses.includes(c.status));
  return delay({ data: filtered });
}

export function createCommission(body: {
  name: string;
  targetLocationId?: string;
  customerId?: string;
  notes?: string;
}): Promise<Commission> {
  const now = new Date().toISOString();
  const newCommission: Commission = {
    id: `commission-demo-${Date.now()}`,
    name: body.name,
    number: null,
    manualNumber: null,
    status: "open",
    notes: body.notes ?? null,
    targetLocationId: body.targetLocationId ?? null,
    targetLocationName: null,
    customerId: body.customerId ?? null,
    customerName: null,
    responsibleId: null,
    responsibleName: null,
    entryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  return delay(newCommission);
}

export function getCommission(
  id: string
): Promise<Commission & { entryCount: number }> {
  const found = DEMO_COMMISSIONS.find((c) => c.id === id);
  if (found) {
    return delay({ ...found, entryCount: found.entryCount });
  }
  // Return a sensible fallback rather than throwing to keep demo stable.
  const fallback: Commission & { entryCount: number } = {
    id,
    name: "Unbekannte Kommission",
    number: null,
    manualNumber: null,
    status: "open",
    notes: null,
    targetLocationId: null,
    targetLocationName: null,
    customerId: null,
    customerName: null,
    responsibleId: null,
    responsibleName: null,
    entryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return delay(fallback);
}

export function updateCommission(
  id: string,
  body: Partial<Pick<Commission, "status" | "name" | "notes">>
): Promise<Commission> {
  const existing = DEMO_COMMISSIONS.find((c) => c.id === id);
  const base = existing ?? DEMO_COMMISSIONS[0];
  return delay({
    ...base,
    ...body,
    id,
    updatedAt: new Date().toISOString(),
  });
}

// ── Commission Entries ────────────────────────────────────────────────────────

export function getCommissionEntries(
  commissionId: string
): Promise<{ data: CommissionEntry[] }> {
  const entries = DEMO_COMMISSION_ENTRIES[commissionId] ?? [];
  return delay({ data: entries });
}

export function addCommissionEntry(
  commissionId: string,
  body: {
    materialId?: string;
    toolId?: string;
    quantity?: number;
    notes?: string;
  }
): Promise<CommissionEntry> {
  const now = new Date().toISOString();
  const entry: CommissionEntry = {
    id: `entry-demo-${Date.now()}`,
    commissionId,
    materialId: body.materialId ?? null,
    materialName: null,
    materialNumber: null,
    materialUnit: null,
    toolId: body.toolId ?? null,
    toolName: null,
    toolNumber: null,
    quantity: body.quantity ?? 1,
    pickedQuantity: 0,
    status: "pending",
    notes: body.notes ?? null,
    createdAt: now,
  };
  return delay(entry);
}

// ── Stock Changes ─────────────────────────────────────────────────────────────

export function createStockChange(body: {
  materialId: string;
  locationId: string;
  changeType: "in" | "out";
  quantity: number;
  notes?: string;
}): Promise<void> {
  console.warn("[demo] createStockChange called — no-op in demo mode", body);
  return delay(undefined);
}

// ── Tool Bookings ─────────────────────────────────────────────────────────────

export function createToolBooking(
  toolId: string,
  body: {
    bookingType: "checkout" | "checkin";
    toLocationId?: string;
    notes?: string;
  }
): Promise<void> {
  console.warn("[demo] createToolBooking called — no-op in demo mode", {
    toolId,
    ...body,
  });
  return delay(undefined);
}


// ── EAN Lookup ────────────────────────────────────────────────────────────────

export function eanLookup(barcode: string): Promise<{
  found: boolean;
  barcode?: string;
  name?: string;
  manufacturer?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  source?: string;
}> {
  return delay({
    found: true,
    barcode,
    name: "Demo Produkt " + barcode.slice(-4),
    manufacturer: "Demo Hersteller AG",
    description: "Beispielprodukt aus EAN-Datenbank",
    category: "Baumaterial",
    source: "demo",
  });
}

// ── Materials ─────────────────────────────────────────────────────────────────

export function createMaterial(body: {
  name: string;
  number?: string;
  unit?: string;
  barcode?: string;
  manufacturer?: string;
  notes?: string;
}): Promise<{ id: string; name: string }> {
  return delay({ id: `mat-demo-${Date.now()}`, name: body.name });
}

// ── Time Tracking ────────────────────────────────────────────────────────────

export function getTimeEntries(): Promise<TimeEntry[]> {
  return delay([...DEMO_TIME_ENTRIES]);
}

export function startTimer(body: {
  commissionId?: string;
  projectId?: string;
  description?: string;
  billable?: boolean;
  hourlyRate?: number;
}): Promise<TimeEntry> {
  const now = new Date().toISOString();
  const entry: TimeEntry = {
    id: `time-demo-${Date.now()}`,
    userId: "demo-user-123",
    userName: "Max Muster",
    commissionId: body.commissionId ?? null,
    commissionName: null,
    projectId: body.projectId ?? null,
    projectName: null,
    description: body.description ?? null,
    startTime: now,
    endTime: null,
    durationMinutes: null,
    billable: body.billable ?? true,
    hourlyRate: body.hourlyRate ?? null,
    status: "running",
  };
  return delay(entry);
}

export function stopTimer(id: string): Promise<TimeEntry> {
  const existing = DEMO_TIME_ENTRIES.find((t) => t.id === id);
  const now = new Date();
  const base = existing ?? DEMO_TIME_ENTRIES[0];
  const start = new Date(base.startTime);
  const durationMinutes = Math.round((now.getTime() - start.getTime()) / 60000);
  return delay({
    ...base,
    id,
    endTime: now.toISOString(),
    durationMinutes,
    status: "stopped",
  });
}

export function deleteTimeEntry(_id: string): Promise<void> {
  console.warn("[demo] deleteTimeEntry called — no-op in demo mode", _id);
  return delay(undefined);
}

// ── Delivery Tracking ────────────────────────────────────────────────────────

export function getDeliveries(): Promise<DeliveryTracking[]> {
  return delay([...DEMO_DELIVERIES]);
}

export function updateDeliveryStatus(
  id: string,
  status: string
): Promise<DeliveryTracking> {
  const existing = DEMO_DELIVERIES.find((d) => d.id === id);
  const base = existing ?? DEMO_DELIVERIES[0];
  return delay({
    ...base,
    id,
    status,
    actualDeliveryDate:
      status === "delivered" ? new Date().toISOString().split("T")[0] : base.actualDeliveryDate,
  });
}

// ── Warranty Claims ──────────────────────────────────────────────────────────

export function getWarrantyClaims(): Promise<WarrantyClaim[]> {
  return delay([...DEMO_WARRANTY_CLAIMS]);
}

export function createWarrantyClaim(body: {
  entityType: string;
  entityName: string;
  reason: string;
  description?: string;
}): Promise<WarrantyClaim> {
  const now = new Date().toISOString();
  const claim: WarrantyClaim = {
    id: `wc-demo-${Date.now()}`,
    claimNumber: `WC-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    entityType: body.entityType,
    entityName: body.entityName,
    reason: body.reason,
    description: body.description ?? null,
    status: "draft",
    resolution: null,
    submittedAt: null,
    resolvedAt: null,
    createdAt: now,
  };
  return delay(claim);
}

export function updateClaimStatus(
  id: string,
  status: string
): Promise<WarrantyClaim> {
  const existing = DEMO_WARRANTY_CLAIMS.find((c) => c.id === id);
  const base = existing ?? DEMO_WARRANTY_CLAIMS[0];
  return delay({
    ...base,
    id,
    status,
    submittedAt:
      status === "submitted" && !base.submittedAt
        ? new Date().toISOString()
        : base.submittedAt,
    resolvedAt:
      status === "resolved" && !base.resolvedAt
        ? new Date().toISOString()
        : base.resolvedAt,
  });
}

// ── Geofences ────────────────────────────────────────────────────────────────

export function getGeofences(): Promise<Geofence[]> {
  return delay([...DEMO_GEOFENCES]);
}

export function getGeofenceEvents(): Promise<GeofenceEvent[]> {
  return delay([...DEMO_GEOFENCE_EVENTS]);
}

// ── BLE Beacons ──────────────────────────────────────────────────────────────

export function getBleBeacons(): Promise<BleBeacon[]> {
  return delay([...DEMO_BLE_BEACONS]);
}

export function reportBeaconSighting(
  _id: string,
  _batteryLevel?: number
): Promise<void> {
  console.warn("[demo] reportBeaconSighting called — no-op in demo mode", _id);
  return delay(undefined);
}

// ── Mock api object ───────────────────────────────────────────────────────────
// Mirrors the shape of the real `api` object from ../api.ts so any call-site
// that reaches through to `api.get / post / patch / delete` gets a warning
// instead of a real network request.

export const api = {
  get<T>(_path: string): Promise<T> {
    console.warn(`[demo] api.get("${_path}") — no-op in demo mode`);
    return delay(undefined as unknown as T);
  },
  post<T>(_path: string, _body: unknown): Promise<T> {
    console.warn(`[demo] api.post("${_path}") — no-op in demo mode`);
    return delay(undefined as unknown as T);
  },
  patch<T>(_path: string, _body: unknown): Promise<T> {
    console.warn(`[demo] api.patch("${_path}") — no-op in demo mode`);
    return delay(undefined as unknown as T);
  },
  delete<T>(_path: string): Promise<T> {
    console.warn(`[demo] api.delete("${_path}") — no-op in demo mode`);
    return delay(undefined as unknown as T);
  },
};
