import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Switch,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";
import {
  startBeaconScanning,
  stopBeaconScanning,
  reportBeaconSighting,
  type BeaconSighting,
  type ParsedBeacon,
} from "@/lib/ble-scanner";
import { isDemoMode } from "@/lib/demo/config";

// ── Types ───────────────────────────────────────────────────────────────

interface RegisteredBeacon {
  id: string;
  name: string | null;
  uuid: string;
  major: number | null;
  minor: number | null;
  locationName: string | null;
  batteryLevel: number | null;
  lastSeenAt: string | null;
  isActive: boolean;
  entityType: string | null;
}

interface NearbyBeacon extends ParsedBeacon {
  beaconId?: string;
  name?: string;
  lastSeen: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function signalColor(rssi: number): string {
  if (rssi > -60) return "#22c55e"; // strong - green
  if (rssi > -80) return "#eab308"; // medium - yellow
  return "#ef4444"; // weak - red
}

function signalLabel(rssi: number): string {
  if (rssi > -60) return "Stark";
  if (rssi > -80) return "Mittel";
  return "Schwach";
}

function batteryColor(level: number | null): string {
  if (level === null) return "#9ca3af";
  if (level > 50) return "#22c55e";
  if (level > 20) return "#eab308";
  return "#ef4444";
}

function batteryIcon(level: number | null): React.ComponentProps<typeof Ionicons>["name"] {
  if (level === null) return "battery-dead-outline";
  if (level > 75) return "battery-full";
  if (level > 50) return "battery-three-quarters-sharp" as any;
  if (level > 20) return "battery-half";
  return "battery-dead";
}

function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return "Nie";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `Vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  return `Vor ${diffD} Tag${diffD > 1 ? "en" : ""}`;
}

// ── Screen ──────────────────────────────────────────────────────────────

export default function BeaconsScreen() {
  const { colors } = useColorScheme();
  const [registered, setRegistered] = useState<RegisteredBeacon[]>([]);
  const [nearby, setNearby] = useState<Map<string, NearbyBeacon>>(new Map());
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const nearbyRef = useRef<Map<string, NearbyBeacon>>(new Map());

  // Fetch registered beacons from API
  const fetchBeacons = useCallback(async () => {
    try {
      const res = await api.get<{ data: RegisteredBeacon[] }>("/api/ble-beacons");
      setRegistered(res.data ?? []);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBeacons();
  }, [fetchBeacons]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBeacons();
  }, [fetchBeacons]);

  // Match a sighting to a registered beacon
  const matchBeacon = useCallback(
    (sighting: BeaconSighting): { id: string; name: string | null } | null => {
      for (const b of registered) {
        if (
          b.uuid.toUpperCase() === sighting.uuid.toUpperCase() &&
          (b.major === null || b.major === sighting.major) &&
          (b.minor === null || b.minor === sighting.minor)
        ) {
          return { id: b.id, name: b.name };
        }
      }
      return null;
    },
    [registered]
  );

  // Handle beacon callback
  const onBeaconDetected = useCallback(
    (sighting: BeaconSighting) => {
      const key = `${sighting.uuid}-${sighting.major}-${sighting.minor}`;
      const match = matchBeacon(sighting);

      const entry: NearbyBeacon = {
        ...sighting,
        beaconId: match?.id,
        name: match?.name ?? undefined,
        lastSeen: Date.now(),
      };

      nearbyRef.current.set(key, entry);
      setNearby(new Map(nearbyRef.current));

      // Report sighting to API if matched
      if (match?.id) {
        reportBeaconSighting(match.id, sighting).catch(() => {});
      }
    },
    [matchBeacon]
  );

  // Toggle scanning
  const toggleScanning = useCallback(async () => {
    if (scanning) {
      stopBeaconScanning();
      setScanning(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (isDemoMode) {
      // Simulate beacons in demo mode
      setScanning(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const demoBeacons: NearbyBeacon[] = [
        {
          uuid: "2D7A9F0C-E0E8-4CC9-A71B-A21DB2D034A1",
          major: 1,
          minor: 100,
          rssi: -55,
          txPower: -59,
          estimatedDistance: 0.8,
          name: "Lager Eingang",
          lastSeen: Date.now(),
        },
        {
          uuid: "2D7A9F0C-E0E8-4CC9-A71B-A21DB2D034A1",
          major: 1,
          minor: 200,
          rssi: -72,
          txPower: -59,
          estimatedDistance: 3.2,
          name: "Werkstatt Tor",
          lastSeen: Date.now(),
        },
        {
          uuid: "2D7A9F0C-E0E8-4CC9-A71B-A21DB2D034A1",
          major: 2,
          minor: 100,
          rssi: -88,
          txPower: -59,
          estimatedDistance: 12.5,
          name: "Buero 2. OG",
          lastSeen: Date.now(),
        },
      ];
      const map = new Map<string, NearbyBeacon>();
      demoBeacons.forEach((b) => {
        map.set(`${b.uuid}-${b.major}-${b.minor}`, b);
      });
      nearbyRef.current = map;
      setNearby(map);
      return;
    }

    const started = await startBeaconScanning(onBeaconDetected);
    if (started) {
      setScanning(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Alert.alert(
        "Bluetooth nicht verfuegbar",
        "Bitte aktiviere Bluetooth und erteile die erforderlichen Berechtigungen in den Einstellungen."
      );
    }
  }, [scanning, onBeaconDetected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBeaconScanning();
    };
  }, []);

  // Clean up stale beacons (not seen for >30s)
  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [key, beacon] of nearbyRef.current) {
        if (now - beacon.lastSeen > 30000) {
          nearbyRef.current.delete(key);
          changed = true;
        }
      }
      if (changed) {
        setNearby(new Map(nearbyRef.current));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [scanning]);

  const nearbyList = Array.from(nearby.values()).sort(
    (a, b) => b.rssi - a.rssi
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="title1" className="font-bold">
            Bluetooth Beacons
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            {registered.length} registrierte Beacons
          </Text>
        </View>

        {/* Scanning Toggle */}
        <View
          style={[styles.scanCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.scanRow}>
            <View style={styles.scanInfo}>
              <Ionicons
                name="bluetooth"
                size={24}
                color={scanning ? "#3b82f6" : colors.grey2}
              />
              <View style={{ marginLeft: 12 }}>
                <Text className="font-semibold">BLE-Scanner</Text>
                <Text className="text-muted-foreground text-xs">
                  {scanning
                    ? `${nearbyList.length} Beacon${nearbyList.length !== 1 ? "s" : ""} in Reichweite`
                    : "Tippe zum Starten"}
                </Text>
              </View>
            </View>
            <Switch
              value={scanning}
              onValueChange={toggleScanning}
              trackColor={{ false: colors.grey2, true: "#3b82f6" }}
              thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            />
          </View>
        </View>

        {/* Nearby Beacons (scanning results) */}
        {scanning && nearbyList.length > 0 && (
          <View style={styles.section}>
            <Text variant="title3" className="font-semibold mb-3">
              In der Naehe
            </Text>
            {nearbyList.map((b) => {
              const key = `${b.uuid}-${b.major}-${b.minor}`;
              return (
                <View
                  key={key}
                  style={[
                    styles.beaconCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.beaconRow}>
                    <View style={styles.signalDot}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: signalColor(b.rssi) },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-medium">
                        {b.name ?? "Unbekannter Beacon"}
                      </Text>
                      <Text className="text-muted-foreground text-xs mt-0.5">
                        {b.uuid.slice(0, 8)}... | Major {b.major} / Minor {b.minor}
                      </Text>
                    </View>
                    <View style={styles.signalInfo}>
                      <Text
                        style={{ color: signalColor(b.rssi), fontSize: 12, fontWeight: "600" }}
                      >
                        {signalLabel(b.rssi)}
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        {b.rssi} dBm | ~{b.estimatedDistance}m
                      </Text>
                    </View>
                  </View>
                  {b.beaconId && (
                    <View style={styles.registeredBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                      <Text style={{ color: "#22c55e", fontSize: 11, marginLeft: 4 }}>
                        Registriert
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {scanning && nearbyList.length === 0 && (
          <View style={[styles.emptyState, { marginTop: 24 }]}>
            <Ionicons name="bluetooth-outline" size={48} color={colors.grey2} />
            <Text className="text-muted-foreground text-sm mt-3">
              Suche nach Beacons...
            </Text>
            <ActivityIndicator style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Registered Beacons List */}
        <View style={styles.section}>
          <Text variant="title3" className="font-semibold mb-3">
            Registrierte Beacons
          </Text>
          {registered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bluetooth-outline" size={48} color={colors.grey2} />
              <Text className="text-muted-foreground text-sm mt-3">
                Noch keine Beacons registriert
              </Text>
            </View>
          ) : (
            registered.map((beacon) => (
              <View
                key={beacon.id}
                style={[
                  styles.beaconCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.beaconRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: beacon.isActive
                          ? "rgba(59,130,246,0.1)"
                          : "rgba(156,163,175,0.1)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="bluetooth"
                      size={20}
                      color={beacon.isActive ? "#3b82f6" : "#9ca3af"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="font-medium">
                      {beacon.name ?? "Unbenannt"}
                    </Text>
                    <Text className="text-muted-foreground text-xs mt-0.5">
                      {beacon.uuid.slice(0, 8)}...
                      {beacon.major !== null ? ` | ${beacon.major}` : ""}
                      {beacon.minor !== null ? `/${beacon.minor}` : ""}
                    </Text>
                    {beacon.locationName && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={colors.grey2} />
                        <Text className="text-muted-foreground text-xs ml-1">
                          {beacon.locationName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.rightInfo}>
                    {/* Battery */}
                    <View style={styles.batteryRow}>
                      <Ionicons
                        name={batteryIcon(beacon.batteryLevel)}
                        size={16}
                        color={batteryColor(beacon.batteryLevel)}
                      />
                      <Text
                        style={{
                          color: batteryColor(beacon.batteryLevel),
                          fontSize: 12,
                          fontWeight: "600",
                          marginLeft: 4,
                        }}
                      >
                        {beacon.batteryLevel !== null ? `${beacon.batteryLevel}%` : "--"}
                      </Text>
                    </View>
                    {/* Last seen */}
                    <Text className="text-muted-foreground text-xs mt-1">
                      {formatLastSeen(beacon.lastSeenAt)}
                    </Text>
                  </View>
                </View>
                {/* Status badge */}
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: beacon.isActive
                          ? "rgba(34,197,94,0.1)"
                          : "rgba(156,163,175,0.1)",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: beacon.isActive ? "#22c55e" : "#9ca3af",
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {beacon.isActive ? "Aktiv" : "Inaktiv"}
                    </Text>
                  </View>
                  {beacon.entityType && (
                    <View style={[styles.statusBadge, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
                      <Text style={{ color: "#3b82f6", fontSize: 11, fontWeight: "600" }}>
                        {beacon.entityType === "tool"
                          ? "Werkzeug"
                          : beacon.entityType === "location"
                            ? "Standort"
                            : beacon.entityType === "zone"
                              ? "Zone"
                              : beacon.entityType}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  scanCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanInfo: { flexDirection: "row", alignItems: "center" },
  section: { marginTop: 24, paddingHorizontal: 16 },
  beaconCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  beaconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  signalDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  signalInfo: { alignItems: "flex-end" },
  registeredBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rightInfo: { alignItems: "flex-end" },
  batteryRow: { flexDirection: "row", alignItems: "center" },
  statusRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
});
