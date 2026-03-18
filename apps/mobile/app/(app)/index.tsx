import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader";
import { Text } from "@/components/nativewindui/Text";
import { useSession } from "@/lib/session-store";
import { getDashboardStats, type DashboardStats } from "@/lib/api";

interface KpiItem {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
}

interface AlertItem {
  label: string;
  count: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}

export default function HomeScreen() {
  const { data } = useSession();
  const user = data?.user;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
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

  const kpis: KpiItem[] = stats
    ? [
        { label: "Materialien", value: stats.materials, icon: "cube", color: "#f97316", bg: "#fff7ed" },
        { label: "Werkzeuge", value: stats.tools, icon: "construct", color: "#0d9488", bg: "#f0fdfa" },
        { label: "Schlüssel", value: stats.keys, icon: "key", color: "#6366f1", bg: "#eef2ff" },
        { label: "Benutzer", value: `${stats.users}/${stats.maxUsers}`, icon: "people", color: "#64748b", bg: "#f8fafc" },
      ]
    : [];

  const alerts: AlertItem[] = stats
    ? [
        { label: "Meldebestand", count: stats.lowStockCount, icon: "warning", color: "#ef4444" },
        { label: "Läuft ab", count: stats.expiringCount, icon: "time", color: "#f97316" },
        { label: "Überfällige Werkzeuge", count: stats.overdueToolsCount, icon: "alert-circle", color: "#8b5cf6" },
      ]
    : [];

  return (
    <>
      <LargeTitleHeader title="Übersicht" backgroundColor="transparent" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pt-2 pb-10 gap-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Greeting */}
        <Card className="p-4">
          <Text variant="heading">
            {firstName ? `Hallo, ${firstName}!` : "Willkommen!"}
          </Text>
          <Text className="text-muted-foreground text-sm mt-0.5">{user?.email}</Text>
        </Card>

        {/* Quick Actions */}
        <View className="flex-row gap-3">
          <Button
            variant="tonal"
            className="flex-1"
            onPress={() => router.push("/(app)/scanner")}
          >
            <Ionicons name="barcode-outline" size={18} className="mr-1" />
            <Text>Scannen</Text>
          </Button>
          <Button
            variant="tonal"
            className="flex-1"
            onPress={() => router.push("/(app)/commissions")}
          >
            <Ionicons name="add-outline" size={18} className="mr-1" />
            <Text>Lieferschein</Text>
          </Button>
        </View>

        {/* KPI Cards */}
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-3">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="flex-1 min-w-[45%] p-4 gap-2">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: kpi.bg }}
                  >
                    <Ionicons name={kpi.icon} size={20} color={kpi.color} />
                  </View>
                  <Text className="text-2xl font-bold tabular-nums">{kpi.value}</Text>
                  <Text className="text-xs text-muted-foreground">{kpi.label}</Text>
                </Card>
              ))}
            </View>

            {/* Alerts */}
            {alerts.some((a) => a.count > 0) && (
              <Card className="p-4 gap-2">
                <Text variant="subhead" className="font-semibold mb-1">Hinweise</Text>
                {alerts
                  .filter((a) => a.count > 0)
                  .map((alert) => (
                    <View key={alert.label} className="flex-row items-center gap-3 py-1">
                      <Ionicons name={alert.icon} size={18} color={alert.color} />
                      <Text className="flex-1 text-sm">{alert.label}</Text>
                      <View className="bg-destructive/10 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-semibold text-destructive">
                          {alert.count}
                        </Text>
                      </View>
                    </View>
                  ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}
