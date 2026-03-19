/**
 * Geofencing Service — uses expo-location + expo-task-manager
 * to monitor geofence regions and auto-report enter/exit events.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { api } from "./api";

const GEOFENCING_TASK = "LOGISTIKAPP_GEOFENCING";

// ── Types ──────────────────────────────────────────────────────────────

export interface Geofence {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  autoCheckin: boolean;
  autoCheckout: boolean;
}

interface GeofencingEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

// ── Permissions ────────────────────────────────────────────────────────

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") return false;

  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();
  return background === "granted";
}

export async function checkLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  return {
    foreground: fg.status === "granted",
    background: bg.status === "granted",
  };
}

// ── Geofence registration ──────────────────────────────────────────────

/** Map of geofence ID -> geofence config for looking up auto-actions */
let geofenceMap = new Map<string, Geofence>();

export async function setupGeofences(geofenceList: Geofence[]): Promise<void> {
  // Store the map for the task handler
  geofenceMap = new Map(geofenceList.map((g) => [g.id, g]));

  const regions: Location.LocationRegion[] = geofenceList.map((g) => ({
    identifier: g.id,
    latitude: g.latitude,
    longitude: g.longitude,
    radius: g.radiusMeters,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  if (regions.length === 0) {
    await stopGeofencing();
    return;
  }

  await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
}

export async function stopGeofencing(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK);
  }
}

export async function isGeofencingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
}

// ── Background task handler ────────────────────────────────────────────

async function handleGeofenceEvent(event: GeofencingEvent): Promise<void> {
  const { eventType, region } = event;
  const geofenceId = region.identifier;

  if (!geofenceId) return;

  const geofence = geofenceMap.get(geofenceId);

  const isEnter =
    eventType === Location.GeofencingEventType.Enter;
  const isExit =
    eventType === Location.GeofencingEventType.Exit;

  // Determine auto-action
  let autoAction: string | null = null;
  if (isEnter && geofence?.autoCheckin) {
    autoAction = "checkin";
  } else if (isExit && geofence?.autoCheckout) {
    autoAction = "checkout";
  }

  try {
    await api.post("/api/geofence-events", {
      geofenceId,
      eventType: isEnter ? "enter" : "exit",
      latitude: region.latitude?.toString(),
      longitude: region.longitude?.toString(),
      autoAction,
    });
  } catch (err) {
    console.warn("[geofencing] Failed to report event:", err);
  }
}

// ── Task definition (must be at top level) ─────────────────────────────

TaskManager.defineTask(
  GEOFENCING_TASK,
  ({
    data,
    error,
  }: {
    data: { eventType: Location.GeofencingEventType; region: Location.LocationRegion } | null;
    error: TaskManager.TaskManagerError | null;
  }) => {
    if (error) {
      console.error("[geofencing] Task error:", error.message);
      return;
    }
    if (!data) return;

    handleGeofenceEvent({
      eventType: data.eventType,
      region: data.region,
    });
  }
);
