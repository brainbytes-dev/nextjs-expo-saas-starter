/**
 * BLE Beacon Scanner
 *
 * Scans for iBeacon advertisements using react-native-ble-plx.
 * Parses manufacturer-specific data (Apple iBeacon format) and
 * reports sightings back to the API.
 */

import { BleManager, Device, State } from "react-native-ble-plx";
import { Platform, PermissionsAndroid } from "react-native";
import { api } from "./api";

// ── Types ───────────────────────────────────────────────────────────────

export interface ParsedBeacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  txPower: number;
  /** Estimated distance in meters (rough) */
  estimatedDistance: number;
}

export interface BeaconSighting extends ParsedBeacon {
  /** API beacon ID — resolved after matching against registered beacons */
  beaconId?: string;
  timestamp: number;
}

type BeaconCallback = (beacon: BeaconSighting) => void;

// ── Singleton BleManager ────────────────────────────────────────────────

let manager: BleManager | null = null;
let scanning = false;
let listener: BeaconCallback | null = null;

function getManager(): BleManager {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}

// ── Permissions ─────────────────────────────────────────────────────────

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "ios") {
    // iOS permissions are handled via Info.plist — BLE scanning works
    // once the user grants Bluetooth permission (prompted automatically).
    return true;
  }

  // Android 12+ (API 31) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
  if (Platform.OS === "android") {
    const apiLevel = Platform.Version;

    if (typeof apiLevel === "number" && apiLevel >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );
    }

    // Android < 12
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
}

// ── iBeacon Parser ──────────────────────────────────────────────────────

/**
 * Parse Apple iBeacon manufacturer-specific data from a BLE advertisement.
 *
 * iBeacon format (manufacturer data after the 2-byte company ID 0x004C):
 *   Byte 0-1: type (0x02) + length (0x15 = 21 bytes)
 *   Byte 2-17: UUID (16 bytes)
 *   Byte 18-19: Major (big-endian uint16)
 *   Byte 20-21: Minor (big-endian uint16)
 *   Byte 22: TX Power (signed int8, measured at 1m)
 */
export function parseIBeacon(
  manufacturerData: string | null,
  rssi: number
): ParsedBeacon | null {
  if (!manufacturerData) return null;

  // manufacturerData from react-native-ble-plx is base64 encoded
  const bytes = base64ToBytes(manufacturerData);

  // Minimum length: 2 (company) + 2 (type+len) + 16 (uuid) + 2 (major) + 2 (minor) + 1 (tx) = 25
  if (bytes.length < 25) return null;

  // Check Apple company ID (0x4C 0x00 in little-endian)
  if (bytes[0] !== 0x4c || bytes[1] !== 0x00) return null;

  // Check iBeacon type (0x02) and length (0x15)
  if (bytes[2] !== 0x02 || bytes[3] !== 0x15) return null;

  // Parse UUID (bytes 4..19)
  const uuidParts: string[] = [];
  for (let i = 4; i < 20; i++) {
    uuidParts.push(bytes[i].toString(16).padStart(2, "0"));
  }
  const uuid = [
    uuidParts.slice(0, 4).join(""),
    uuidParts.slice(4, 6).join(""),
    uuidParts.slice(6, 8).join(""),
    uuidParts.slice(8, 10).join(""),
    uuidParts.slice(10, 16).join(""),
  ]
    .join("-")
    .toUpperCase();

  // Major (bytes 20-21, big-endian)
  const major = (bytes[20] << 8) | bytes[21];

  // Minor (bytes 22-23, big-endian)
  const minor = (bytes[22] << 8) | bytes[23];

  // TX Power (byte 24, signed int8)
  const txPower = bytes[24] > 127 ? bytes[24] - 256 : bytes[24];

  // Rough distance estimate using log-distance path loss model
  const estimatedDistance = estimateDistance(rssi, txPower);

  return { uuid, major, minor, rssi, txPower, estimatedDistance };
}

function estimateDistance(rssi: number, txPower: number): number {
  if (rssi === 0) return -1;
  const ratio = (txPower - rssi) / (10 * 2.0); // path loss exponent ~2.0
  return Math.round(Math.pow(10, ratio) * 100) / 100;
}

function base64ToBytes(base64: string): number[] {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of base64) {
    if (char === "=") break;
    const val = chars.indexOf(char);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
}

// ── Scanning ────────────────────────────────────────────────────────────

/**
 * Start scanning for iBeacon advertisements.
 * Calls `onBeacon` each time a valid iBeacon is detected.
 */
export async function startBeaconScanning(
  onBeacon: BeaconCallback
): Promise<boolean> {
  if (scanning) return true;

  const permitted = await requestPermissions();
  if (!permitted) return false;

  const mgr = getManager();

  // Wait for Bluetooth to be powered on
  const state = await mgr.state();
  if (state !== State.PoweredOn) {
    return new Promise((resolve) => {
      const sub = mgr.onStateChange((newState) => {
        if (newState === State.PoweredOn) {
          sub.remove();
          beginScan(mgr, onBeacon);
          resolve(true);
        }
      }, true);

      // Timeout after 5 seconds
      setTimeout(() => {
        sub.remove();
        if (!scanning) resolve(false);
      }, 5000);
    });
  }

  beginScan(mgr, onBeacon);
  return true;
}

function beginScan(mgr: BleManager, onBeacon: BeaconCallback) {
  scanning = true;
  listener = onBeacon;

  mgr.startDeviceScan(
    null, // Scan for all service UUIDs
    { allowDuplicates: true },
    (error, device) => {
      if (error) {
        console.warn("[BLE] Scan error:", error.message);
        return;
      }
      if (!device) return;

      const parsed = parseIBeacon(
        device.manufacturerData,
        device.rssi ?? -100
      );

      if (parsed && listener) {
        const sighting: BeaconSighting = {
          ...parsed,
          timestamp: Date.now(),
        };
        listener(sighting);
      }
    }
  );
}

/**
 * Stop BLE scanning.
 */
export function stopBeaconScanning() {
  if (!scanning) return;
  scanning = false;
  listener = null;

  try {
    getManager().stopDeviceScan();
  } catch {
    // Manager may already be destroyed
  }
}

/**
 * Returns whether the scanner is currently active.
 */
export function isScanning(): boolean {
  return scanning;
}

// ── API Reporting ───────────────────────────────────────────────────────

/**
 * Report a beacon sighting to the API — updates `lastSeenAt` and optionally `batteryLevel`.
 */
export async function reportBeaconSighting(
  beaconId: string,
  beacon: ParsedBeacon,
  batteryLevel?: number
): Promise<void> {
  try {
    await api.patch(`/api/ble-beacons/${beaconId}`, {
      lastSeenAt: new Date().toISOString(),
      ...(batteryLevel !== undefined ? { batteryLevel } : {}),
    });
  } catch (err) {
    console.warn("[BLE] Failed to report sighting:", err);
  }
}
