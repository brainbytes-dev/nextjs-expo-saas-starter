import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "burnt";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";
import {
  setupGeofences,
  stopGeofencing,
  isGeofencingActive,
  requestLocationPermissions,
  checkLocationPermissions,
  type Geofence,
} from "@/lib/geofencing";

// ── Types ──────────────────────────────────────────────────────────────

interface GeofenceRow {
  id: string;
  locationId: string;
  locationName: string | null;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  autoCheckin: boolean | null;
  autoCheckout: boolean | null;
  isActive: boolean;
}

interface GeofenceEvent {
  id: string;
  geofenceId: string;
  userName: string | null;
  eventType: string;
  triggeredAt: string;
  autoAction: string | null;
  locationName: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
}

// ── Main Screen ────────────────────────────────────────────────────────

export default function GeofencingScreen() {
  const { colors } = useColorScheme();
  const [geofencesList, setGeofencesList] = useState<GeofenceRow[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [geoRes, eventsRes] = await Promise.all([
        api.get<{ data: GeofenceRow[] }>("/api/geofences"),
        api.get<{ data: GeofenceEvent[] }>("/api/geofence-events?limit=20"),
      ]);
      setGeofencesList(geoRes.data ?? []);
      setEvents(eventsRes.data ?? []);
    } catch (err) {
      console.warn("[geofencing] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check permissions & active state on mount
  useEffect(() => {
    (async () => {
      const perms = await checkLocationPermissions();
      setPermGranted(perms.foreground && perms.background);
      const active = await isGeofencingActive();
      setEnabled(active);
    })();
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Permission request ─────────────────────────────────────────────

  async function handleRequestPermissions() {
    const granted = await requestLocationPermissions();
    setPermGranted(granted);
    if (granted) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: "Standortberechtigung erteilt", preset: "done" });
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Berechtigung erforderlich",
        'Bitte aktiviere "Immer" unter Einstellungen > Standort fuer diese App.',
        [{ text: "OK" }]
      );
    }
  }

  // ── Toggle geofencing ──────────────────────────────────────────────

  async function handleToggle() {
    if (enabled) {
      await stopGeofencing();
      setEnabled(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      toast({ title: "Geofencing deaktiviert", preset: "done" });
      return;
    }

    // Need permissions first
    if (!permGranted) {
      const granted = await requestLocationPermissions();
      setPermGranted(granted);
      if (!granted) {
        Alert.alert(
          "Berechtigung erforderlich",
          "Hintergrund-Standort wird fuer Geofencing benoetigt."
        );
        return;
      }
    }

    const activeGeofences = geofencesList.filter((g) => g.isActive);
    if (activeGeofences.length === 0) {
      toast({
        title: "Keine aktiven Geofences",
        message: "Erstelle zuerst einen Geofence im Web-Dashboard.",
        preset: "error",
      });
      return;
    }

    const regions: Geofence[] = activeGeofences.map((g) => ({
      id: g.id,
      latitude: parseFloat(g.latitude),
      longitude: parseFloat(g.longitude),
      radiusMeters: g.radiusMeters,
      autoCheckin: g.autoCheckin ?? true,
      autoCheckout: g.autoCheckout ?? true,
    }));

    await setupGeofences(regions);
    setEnabled(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast({
      title: "Geofencing aktiviert",
      message: `${regions.length} Bereiche werden ueberwacht.`,
      preset: "done",
    });
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = geofencesList.filter((g) => g.isActive).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="py-4">
          <Text variant="largeTitle" className="font-bold">
            Geofencing
          </Text>
          <Text className="text-muted-foreground mt-1">
            Automatische Standort-Aktionen
          </Text>
        </View>

        {/* Permission banner */}
        {permGranted === false && (
          <View className="bg-destructive/10 mb-4 rounded-xl p-4">
            <Text className="text-destructive font-semibold mb-1">
              Standortberechtigung fehlt
            </Text>
            <Text className="text-destructive/80 text-sm mb-3">
              Geofencing benoetigt die Berechtigung &quot;Immer&quot; fuer den
              Hintergrund-Standort.
            </Text>
            <Button variant="primary" onPress={handleRequestPermissions}>
              <Text className="text-white font-semibold">
                Berechtigung erteilen
              </Text>
            </Button>
          </View>
        )}

        {/* Toggle Card */}
        <View className="bg-card mb-4 rounded-xl p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-semibold text-base">
                Geofencing {enabled ? "aktiv" : "inaktiv"}
              </Text>
              <Text className="text-muted-foreground text-sm mt-0.5">
                {enabled
                  ? `${activeCount} Bereiche werden ueberwacht`
                  : "Tippe zum Aktivieren"}
              </Text>
            </View>
            <Button
              variant={enabled ? "secondary" : "primary"}
              onPress={handleToggle}
              style={{ minWidth: 110 }}
            >
              <Ionicons
                name={enabled ? "stop-circle-outline" : "play-circle-outline"}
                size={18}
                color={enabled ? colors.foreground : "#fff"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: enabled ? colors.foreground : "#fff",
                  fontWeight: "600",
                }}
              >
                {enabled ? "Stoppen" : "Starten"}
              </Text>
            </Button>
          </View>
        </View>

        {/* Active geofences */}
        <Text variant="title3" className="font-semibold mb-2">
          Geofences ({geofencesList.length})
        </Text>

        {geofencesList.length === 0 ? (
          <View className="bg-card rounded-xl p-6 items-center">
            <Ionicons
              name="location-outline"
              size={40}
              color={colors.grey}
            />
            <Text className="text-muted-foreground text-center mt-3">
              Noch keine Geofences vorhanden.{"\n"}Erstelle welche im
              Web-Dashboard.
            </Text>
          </View>
        ) : (
          <View className="gap-2 mb-4">
            {geofencesList.map((g) => (
              <View
                key={g.id}
                className="bg-card rounded-xl p-4 flex-row items-center"
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: g.isActive
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(156,163,175,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="location"
                    size={20}
                    color={g.isActive ? "#22c55e" : "#9ca3af"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold">
                    {g.locationName ?? "Unbekannt"}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    {parseFloat(g.latitude).toFixed(4)},{" "}
                    {parseFloat(g.longitude).toFixed(4)} &middot;{" "}
                    {g.radiusMeters} m
                  </Text>
                </View>
                <View className="items-end">
                  <View
                    style={{
                      backgroundColor: g.isActive
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(156,163,175,0.15)",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: g.isActive ? "#22c55e" : "#9ca3af",
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {g.isActive ? "Aktiv" : "Inaktiv"}
                    </Text>
                  </View>
                  <View className="flex-row mt-1 gap-2">
                    {g.autoCheckin && (
                      <Text className="text-xs text-muted-foreground">
                        <Ionicons name="log-in-outline" size={10} /> CI
                      </Text>
                    )}
                    {g.autoCheckout && (
                      <Text className="text-xs text-muted-foreground">
                        <Ionicons name="log-out-outline" size={10} /> CO
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Events */}
        <Text variant="title3" className="font-semibold mb-2 mt-2">
          Letzte Events
        </Text>

        {events.length === 0 ? (
          <View className="bg-card rounded-xl p-6 items-center">
            <Ionicons
              name="pulse-outline"
              size={40}
              color={colors.grey}
            />
            <Text className="text-muted-foreground text-center mt-3">
              Noch keine Events vorhanden.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {events.map((ev) => (
              <View
                key={ev.id}
                className="bg-card rounded-xl p-3 flex-row items-center"
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      ev.eventType === "enter"
                        ? "rgba(59,130,246,0.15)"
                        : "rgba(249,115,22,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons
                    name={
                      ev.eventType === "enter"
                        ? "log-in-outline"
                        : "log-out-outline"
                    }
                    size={16}
                    color={ev.eventType === "enter" ? "#3b82f6" : "#f97316"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium">
                    {ev.userName ?? "Unbekannt"} &middot;{" "}
                    {ev.locationName ?? "—"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {ev.eventType === "enter" ? "Eintritt" : "Austritt"}
                    {ev.autoAction
                      ? ` (Auto-${ev.autoAction === "checkin" ? "Checkin" : "Checkout"})`
                      : ""}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground">
                  {formatDate(ev.triggeredAt)} {formatTime(ev.triggeredAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
