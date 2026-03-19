/**
 * Apple Watch companion settings & status screen.
 *
 * Shows the connection status, last sync time, available watch features, and
 * a manual sync button. This is a standalone screen (not a tab) — navigate
 * to it from Settings or the Dashboard.
 */

import { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/nativewindui/Text";
import { Card } from "@/components/nativewindui/Card";
import { Button } from "@/components/nativewindui/Button";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { useColorScheme } from "@/lib/useColorScheme";
import { useWatchSync } from "@/hooks/useWatchSync";

// ── Feature definitions ─────────────────────────────────────────────────

interface WatchFeature {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  color: string;
  bg: string;
  available: boolean;
}

const WATCH_FEATURES: WatchFeature[] = [
  {
    icon: "barcode-outline",
    title: "Quick Scan",
    description:
      "Barcodes direkt mit der Watch-Kamera scannen und ans iPhone senden.",
    color: "#f97316",
    bg: "#fff7ed",
    available: true,
  },
  {
    icon: "timer-outline",
    title: "Zeiterfassung",
    description:
      "Timer starten/stoppen direkt am Handgelenk. Daten werden automatisch synchronisiert.",
    color: "#0d9488",
    bg: "#f0fdfa",
    available: true,
  },
  {
    icon: "swap-horizontal-outline",
    title: "Werkzeug Check-in/out",
    description:
      "Werkzeuge schnell ein- und auschecken ohne das iPhone aus der Tasche zu nehmen.",
    color: "#6366f1",
    bg: "#eef2ff",
    available: true,
  },
  {
    icon: "notifications-outline",
    title: "Komplikationen",
    description:
      "Aktiver Timer und offene Aufgaben direkt auf dem Zifferblatt anzeigen.",
    color: "#ef4444",
    bg: "#fef2f2",
    available: true,
  },
  {
    icon: "eye-outline",
    title: "Glance-Ansicht",
    description:
      "Aktuelle Werkzeugbuchungen und Timer-Status auf einen Blick.",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    available: true,
  },
];

// ── Screen ──────────────────────────────────────────────────────────────

export default function WatchScreen() {
  const { colors } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    isPaired,
    isInstalled,
    isReachable,
    isSupported,
    lastSyncedAt,
    isSyncing,
    lastError,
    syncNow,
    refreshStatus,
  } = useWatchSync();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshStatus();
    await syncNow();
    setRefreshing(false);
  }, [refreshStatus, syncNow]);

  const handleManualSync = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncNow();
    if (!lastError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [syncNow, lastError]);

  const handleOpenWatchApp = useCallback(() => {
    // Deep-link to Watch app on iPhone (opens the Watch app settings)
    if (Platform.OS === "ios") {
      Linking.openURL("itms-watchs://").catch(() => {
        Alert.alert(
          "Apple Watch",
          "Die Watch-App konnte nicht geöffnet werden. Stelle sicher, dass eine Apple Watch gekoppelt ist."
        );
      });
    }
  }, []);

  // Connection status determination
  const connectionStatus = getConnectionStatus(isSupported, isPaired, isInstalled, isReachable);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Apple Watch",
          headerShown: true,
          headerBackTitle: "Zurück",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={[]} className="bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <Text variant="largeTitle" className="font-bold">
            Apple Watch
          </Text>

          {/* Connection Status Card */}
          <Card className="p-5">
            <View className="flex-row items-center gap-4">
              <View
                style={[
                  styles.statusIconWrap,
                  { backgroundColor: connectionStatus.bg },
                ]}
              >
                <Ionicons
                  name={connectionStatus.icon}
                  size={28}
                  color={connectionStatus.color}
                />
              </View>
              <View className="flex-1">
                <Text variant="heading" className="font-semibold">
                  {connectionStatus.title}
                </Text>
                <Text className="text-muted-foreground text-sm mt-0.5">
                  {connectionStatus.subtitle}
                </Text>
              </View>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isReachable
                      ? "#16a34a"
                      : isPaired
                        ? "#f97316"
                        : "#9ca3af",
                  },
                ]}
              />
            </View>
          </Card>

          {/* Sync Status */}
          <Card className="p-4 gap-3">
            <Text variant="subhead" className="font-semibold">
              Synchronisation
            </Text>

            <View className="gap-2">
              <InfoRow
                label="Letzter Sync"
                value={
                  lastSyncedAt
                    ? formatTimestamp(lastSyncedAt)
                    : "Noch nicht synchronisiert"
                }
              />
              <InfoRow
                label="Status"
                value={
                  isSyncing
                    ? "Synchronisiere..."
                    : lastError
                      ? `Fehler: ${lastError}`
                      : "Bereit"
                }
                valueColor={lastError ? "#ef4444" : undefined}
              />
            </View>

            <View className="flex-row gap-3 mt-1">
              <View className="flex-1">
                <Button
                  variant="primary"
                  onPress={handleManualSync}
                  disabled={isSyncing || !isSupported}
                >
                  {isSyncing ? (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator color="#fff" />
                      <Text className="text-white font-semibold text-sm">
                        Synchronisiere...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-semibold text-sm">
                      Jetzt synchronisieren
                    </Text>
                  )}
                </Button>
              </View>
            </View>
          </Card>

          {/* Watch Features */}
          <View style={{ gap: 10 }}>
            <Text variant="subhead" className="font-semibold text-foreground">
              Watch-Funktionen
            </Text>
            <Text className="text-muted-foreground text-xs -mt-1">
              Diese Funktionen sind auf der Apple Watch verfügbar, sobald die
              native Watch-App installiert ist.
            </Text>

            {WATCH_FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </View>

          {/* Native App Notice */}
          <Card className="p-4 gap-2" style={styles.noticeCard}>
            <View className="flex-row items-center gap-2">
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text variant="subhead" className="font-semibold">
                Native Watch-App erforderlich
              </Text>
            </View>
            <Text className="text-muted-foreground text-sm leading-5">
              Die Apple Watch-App wird nativ mit SwiftUI entwickelt und über das
              WatchConnectivity-Framework mit der iPhone-App verbunden. Diese
              Seite zeigt den Verbindungsstatus und steuert die
              Datensynchronisation.
            </Text>
            {Platform.OS === "ios" && (
              <Button
                variant="plain"
                onPress={handleOpenWatchApp}
                className="mt-1 self-start"
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color="#6366f1"
                  />
                  <Text className="text-sm font-medium" style={{ color: "#6366f1" }}>
                    Watch-App öffnen
                  </Text>
                </View>
              </Button>
            )}
          </Card>

          {/* Platform warning for Android */}
          {Platform.OS !== "ios" && (
            <Card className="p-4" style={styles.warningCard}>
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color="#f97316"
                />
                <Text className="flex-1 text-sm text-muted-foreground">
                  Apple Watch wird nur auf iOS-Geräten unterstützt.
                </Text>
              </View>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className="flex-row justify-between items-center py-1">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text
        className="text-sm font-medium"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

function FeatureCard({ feature }: { feature: WatchFeature }) {
  return (
    <View style={styles.featureCard}>
      <View
        style={[
          styles.featureIconWrap,
          {
            backgroundColor:
              Platform.OS === "ios" ? feature.bg : feature.color + "18",
          },
        ]}
      >
        <Ionicons name={feature.icon} size={22} color={feature.color} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDesc}>{feature.description}</Text>
      </View>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getConnectionStatus(
  isSupported: boolean,
  isPaired: boolean,
  isInstalled: boolean,
  isReachable: boolean
): {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  color: string;
  bg: string;
} {
  if (!isSupported) {
    return {
      icon: "close-circle-outline",
      title: "Nicht unterstützt",
      subtitle: "Apple Watch erfordert ein iOS-Gerät.",
      color: "#9ca3af",
      bg: "#f3f4f6",
    };
  }

  if (!isPaired) {
    return {
      icon: "watch-outline",
      title: "Keine Watch gekoppelt",
      subtitle: "Koppele eine Apple Watch in den iPhone-Einstellungen.",
      color: "#9ca3af",
      bg: "#f3f4f6",
    };
  }

  if (!isInstalled) {
    return {
      icon: "download-outline",
      title: "App nicht installiert",
      subtitle: "Installiere die LogistikApp auf deiner Apple Watch.",
      color: "#f97316",
      bg: "#fff7ed",
    };
  }

  if (!isReachable) {
    return {
      icon: "watch-outline",
      title: "Watch nicht erreichbar",
      subtitle: "Die Watch ist ausser Reichweite oder im Ruhezustand.",
      color: "#f97316",
      bg: "#fff7ed",
    };
  }

  return {
    icon: "watch-outline",
    title: "Verbunden",
    subtitle: "Apple Watch ist verbunden und bereit.",
    color: "#16a34a",
    bg: "#f0fdf4",
  };
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Gerade eben";
    if (diffMin < 60) return `Vor ${diffMin} Min.`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Vor ${diffHours} Std.`;

    return date.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statusIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  featureDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
  },
  warningCard: {
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.2)",
  },
});
