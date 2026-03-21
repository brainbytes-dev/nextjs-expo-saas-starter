import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, RefreshControl, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Card } from "@/components/nativewindui/Card";
import { Text } from "@/components/nativewindui/Text";
import { useSession } from "@/lib/session-store";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { useColorScheme } from "@/lib/useColorScheme";

// ── Types ──────────────────────────────────────────────────────────────

interface QuickActionDef {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  bgDark: string;
  onPress: () => void;
}

// ── Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { data } = useSession();
  const user = data?.user;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDarkColorScheme: isDark } = useColorScheme();

  const fetchStats = useCallback(async () => {
    try {
      const result = await getDashboardStats();
      setStats(result);
    } catch {
      // Keep showing last known data or null
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const firstName = user?.name?.split(" ")[0] ?? "";

  // Navigate to scanner pre-selecting a specific mode via a query param.
  // The scanner screen reads the param on mount (future enhancement hook).
  function goToScanner(mode?: "camera" | "nfc" | "ar" | "batch") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode) {
      router.push({ pathname: "/(app)/scanner", params: { mode } });
    } else {
      router.push("/(app)/scanner");
    }
  }

  function goToCommissions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/commissions");
  }

  function goToDeliveries() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/deliveries");
  }

  function goToWarrantyClaims() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/warranty-claims");
  }

  const quickActions: QuickActionDef[] = [
    {
      icon: "arrow-down-circle",
      label: "Wareneingang",
      sublabel: "Material einbuchen",
      color: "#16a34a",
      bg: "#f0fdf4", bgDark: "#052e16",
      onPress: () => goToScanner("camera"),
    },
    {
      icon: "arrow-up-circle",
      label: "Warenausgang",
      sublabel: "Material ausbuchen",
      color: "#ef4444",
      bg: "#fef2f2", bgDark: "#450a0a",
      onPress: () => goToScanner("camera"),
    },
    {
      icon: "construct",
      label: "Werkzeug entnehmen",
      sublabel: "Werkzeug auschecken",
      color: "#0d9488",
      bg: "#f0fdfa", bgDark: "#042f2e",
      onPress: () => goToScanner("camera"),
    },
    {
      icon: "document-text",
      label: "Lieferschein scannen",
      sublabel: "Batch-Scan starten",
      color: "#f97316",
      bg: "#fff7ed", bgDark: "#431407",
      onPress: () => goToScanner("batch"),
    },
    {
      icon: "time",
      label: "Zeiterfassung",
      sublabel: "Timer starten & stoppen",
      color: "#8b5cf6",
      bg: "#f5f3ff", bgDark: "#2e1065",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(app)/time-tracking");
      },
    },
    {
      icon: "chatbubble-ellipses",
      label: "KI-Assistent",
      sublabel: "Fragen zu Bestand & Werkzeugen",
      color: "#0ea5e9",
      bg: "#f0f9ff", bgDark: "#0c4a6e",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(app)/ai-chat");
      },
    },
    {
      icon: "list",
      label: "Inventur",
      sublabel: "Bestand zählen",
      color: "#6366f1",
      bg: "#eef2ff", bgDark: "#1e1b4b",
      onPress: () => goToScanner("batch"),
    },
    {
      icon: "cube",
      label: "Lieferungen",
      sublabel: "Lieferungen verfolgen",
      color: "#0ea5e9",
      bg: "#f0f9ff", bgDark: "#0c4a6e",
      onPress: goToDeliveries,
    },
    {
      icon: "shield-checkmark",
      label: "Garantie",
      sublabel: "Ansprüche verwalten",
      color: "#8b5cf6",
      bg: "#f5f3ff", bgDark: "#2e1065",
      onPress: goToWarrantyClaims,
    },
    {
      icon: "wallet",
      label: "Budgets",
      sublabel: "Ausgaben & Budgets verwalten",
      color: "#16a34a",
      bg: "#f0fdf4", bgDark: "#052e16",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(app)/budgets" as any);
      },
    },
    {
      icon: "repeat",
      label: "Wiederkehrende Bestellungen",
      sublabel: "Automatische Nachbestellungen",
      color: "#0ea5e9",
      bg: "#f0f9ff", bgDark: "#0c4a6e",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(app)/recurring-orders" as any);
      },
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Title — matches iOS Large Title style */}
        <Text variant="largeTitle" className="font-bold">
          Übersicht
        </Text>

        {/* Greeting */}
        <Card className="p-4">
          <Text variant="heading">
            {firstName ? `Hallo, ${firstName}!` : "Willkommen!"}
          </Text>
          <Text className="text-muted-foreground text-sm mt-0.5">
            {user?.email}
          </Text>
        </Card>

        {/* KPI Cards */}
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator />
          </View>
        ) : stats ? (
          <>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <KpiCard label="Materialien" value={stats.materials} icon="cube" color="#f97316" bg="#fff7ed" bgDark="#431407" />
                <KpiCard label="Werkzeuge" value={stats.tools} icon="construct" color="#0d9488" bg="#f0fdfa" bgDark="#042f2e" />
              </View>
              <View className="flex-row gap-3">
                <KpiCard label="Schlüssel" value={stats.keys} icon="key" color="#6366f1" bg="#eef2ff" bgDark="#1e1b4b" />
                <KpiCard label="Benutzer" value={`${stats.users}/${stats.maxUsers}`} icon="people" color="#64748b" bg="#f8fafc" bgDark="#1e293b" />
              </View>
            </View>

            {/* Alerts */}
            {(stats.lowStockCount > 0 || stats.expiringCount > 0 || stats.overdueToolsCount > 0) && (
              <Card className="p-4 gap-2">
                <Text variant="subhead" className="font-semibold mb-1">Hinweise</Text>
                {stats.lowStockCount > 0 && (
                  <AlertRow label="Meldebestand" count={stats.lowStockCount} icon="warning" color="#ef4444" />
                )}
                {stats.expiringCount > 0 && (
                  <AlertRow label="Läuft ab" count={stats.expiringCount} icon="time" color="#f97316" />
                )}
                {stats.overdueToolsCount > 0 && (
                  <AlertRow label="Überfällige Werkzeuge" count={stats.overdueToolsCount} icon="alert-circle" color="#8b5cf6" />
                )}
                {stats.pendingDeliveries > 0 && (
                  <AlertRow label="Offene Lieferungen" count={stats.pendingDeliveries} icon="cube" color="#0ea5e9" />
                )}
                {stats.openWarrantyClaims > 0 && (
                  <AlertRow label="Offene Garantieansprüche" count={stats.openWarrantyClaims} icon="shield-checkmark" color="#8b5cf6" />
                )}
              </Card>
            )}
          </>
        ) : null}

        {/* Quick Actions */}
        <View style={{ gap: 10 }}>
          <Text variant="subhead" className="font-semibold text-foreground">
            Schnellzugriff
          </Text>
          {quickActions.map((action) => (
            <QuickActionCard key={action.label} action={action} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── QuickActionCard ────────────────────────────────────────────────────

function QuickActionCard({ action }: { action: QuickActionDef }) {
  return (
    <TouchableOpacity
      style={[styles.qaCard]}
      onPress={action.onPress}
      activeOpacity={0.72}
    >
      {/* Icon container */}
      <View
        style={[
          styles.qaIconWrap,
          {
            backgroundColor:
              isDark ? action.bgDark : (Platform.OS === "ios" ? action.bg : action.color + "18"),
          },
        ]}
      >
        <Ionicons name={action.icon} size={26} color={action.color} />
      </View>

      {/* Labels */}
      <View style={styles.qaTextWrap}>
        <Text style={styles.qaLabel}>{action.label}</Text>
        <Text style={styles.qaSublabel}>{action.sublabel}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

// ── KpiCard ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, bg, bgDark }: {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
  bgDark?: string;
}) {
  const { isDarkColorScheme } = useColorScheme();
  return (
    <View className="flex-1">
      <Card className="p-4 gap-1.5">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: isDarkColorScheme && bgDark ? bgDark : bg }}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text className="text-2xl font-bold tabular-nums">{value}</Text>
        <Text className="text-xs text-muted-foreground">{label}</Text>
      </Card>
    </View>
  );
}

// ── AlertRow ───────────────────────────────────────────────────────────

function AlertRow({ label, count, icon, color }: {
  label: string;
  count: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="flex-1 text-sm">{label}</Text>
      <View style={{ backgroundColor: color + "18" }} className="px-2 py-0.5 rounded-full">
        <Text style={{ color }} className="text-xs font-semibold">{count}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  qaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Platform.OS === "ios"
      ? "rgba(255,255,255,0.6)"
      : "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    // iOS card shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  qaIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qaTextWrap: {
    flex: 1,
    gap: 2,
  },
  qaLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  qaSublabel: {
    fontSize: 12,
    color: "#6b7280",
  },
});
