/**
 * Delivery status change notifications.
 *
 * Polls /api/deliveries, compares against the last known statuses stored in
 * AsyncStorage, and fires a local notification for each status change.
 * Follows the same best-effort, never-throw pattern as notifications.ts.
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { isDemoMode } from "./demo/config";
import { isNotificationsEnabled } from "./notifications";
import type { DeliveryTracking } from "./api-types";

const DELIVERY_STATUSES_KEY = "delivery_last_statuses";

const STATUS_LABELS: Record<string, string> = {
  ordered: "Bestellt",
  confirmed: "Bestätigt",
  shipped: "Versendet",
  in_transit: "Unterwegs",
  delivered: "Geliefert",
};

/**
 * Check for delivery status changes and show local notifications.
 * Safe to call from useEffect — will never throw.
 */
export async function checkDeliveryUpdates(): Promise<void> {
  try {
    // Skip if notifications are disabled or demo mode
    const enabled = await isNotificationsEnabled();
    if (!enabled || isDemoMode) return;

    // Fetch current deliveries
    const res = await api.get<{ data: DeliveryTracking[] }>(
      "/api/deliveries?limit=50"
    );
    const deliveries = res.data;

    // Load last known statuses
    const storedRaw = await AsyncStorage.getItem(DELIVERY_STATUSES_KEY);
    const lastStatuses: Record<string, string> = storedRaw
      ? JSON.parse(storedRaw)
      : {};

    // Detect changes
    const newStatuses: Record<string, string> = {};
    const changes: { orderNumber: string; newStatus: string }[] = [];

    for (const delivery of deliveries) {
      const key = delivery.id;
      newStatuses[key] = delivery.status;

      const previousStatus = lastStatuses[key];
      if (previousStatus && previousStatus !== delivery.status) {
        changes.push({
          orderNumber:
            delivery.orderNumber ??
            `B-${delivery.orderId.slice(0, 8)}`,
          newStatus: delivery.status,
        });
      }
    }

    // Persist current statuses for next comparison
    await AsyncStorage.setItem(
      DELIVERY_STATUSES_KEY,
      JSON.stringify(newStatuses)
    );

    // Fire local notifications for each change
    for (const change of changes) {
      const statusLabel =
        STATUS_LABELS[change.newStatus] ?? change.newStatus;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Lieferstatus geändert",
          body: `Lieferung ${change.orderNumber}: Status geändert auf ${statusLabel}`,
          sound: "default",
          data: { type: "delivery-status-change" },
        },
        trigger: null, // Immediately
      });
    }
  } catch {
    // Best-effort — silently swallow errors
  }
}
