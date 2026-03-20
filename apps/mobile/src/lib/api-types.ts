export interface DashboardStats {
  materials: number;
  tools: number;
  keys: number;
  users: number;
  maxUsers: number;
  lowStockCount: number;
  expiringCount: number;
  overdueToolsCount: number;
  activeTimerMinutes: number | null;
  pendingDeliveries: number;
  openWarrantyClaims: number;
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

// ── Time Tracking ──────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  commissionId: string | null;
  commissionName: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  billable: boolean;
  hourlyRate: number | null; // cents
  status: string; // running, stopped, approved
}

// ── Delivery Tracking ──────────────────────────────────────────────────────

export interface DeliveryTracking {
  id: string;
  orderId: string;
  orderNumber: string | null;
  supplierName: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: string; // ordered, confirmed, shipped, in_transit, delivered
  notes: string | null;
  createdAt: string;
}

// ── Warranty Claims ────────────────────────────────────────────────────────

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  entityType: string;
  entityName: string;
  reason: string;
  description: string | null;
  status: string; // draft, submitted, in_review, approved, rejected, resolved
  resolution: string | null;
  submittedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ── Geofences ──────────────────────────────────────────────────────────────

export interface Geofence {
  id: string;
  locationId: string;
  locationName: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  autoCheckin: boolean;
  autoCheckout: boolean;
  isActive: boolean;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  locationName: string;
  userId: string;
  userName: string;
  eventType: string; // enter, exit
  triggeredAt: string;
  autoAction: string | null;
}

// ── BLE Beacons ────────────────────────────────────────────────────────────

export interface BleBeacon {
  id: string;
  name: string;
  beaconUuid: string;
  major: number | null;
  minor: number | null;
  locationName: string | null;
  entityType: string | null;
  batteryLevel: number | null;
  lastSeenAt: string | null;
  isActive: boolean;
}
