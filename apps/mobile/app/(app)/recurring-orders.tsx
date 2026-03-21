import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "burnt";

import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────

interface RecurringOrder {
  id: string;
  name: string;
  supplierName: string | null;
  frequency: string; // weekly, biweekly, monthly, quarterly
  nextRunDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function getFrequencyLabel(freq: string): string {
  switch (freq) {
    case "weekly":
      return "Wöchentlich";
    case "biweekly":
      return "Zweiwöchentlich";
    case "monthly":
      return "Monatlich";
    case "quarterly":
      return "Quartalsweise";
    case "yearly":
      return "Jährlich";
    default:
      return freq;
  }
}

function getFrequencyColor(freq: string): { color: string; bg: string } {
  switch (freq) {
    case "weekly":
      return { color: "#0ea5e9", bg: "#f0f9ff" };
    case "biweekly":
      return { color: "#6366f1", bg: "#eef2ff" };
    case "monthly":
      return { color: "#f97316", bg: "#fff7ed" };
    case "quarterly":
      return { color: "#8b5cf6", bg: "#f5f3ff" };
    case "yearly":
      return { color: "#16a34a", bg: "#f0fdf4" };
    default:
      return { color: "#64748b", bg: "#f8fafc" };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "---";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Screen ─────────────────────────────────────────────────────────────

export default function RecurringOrdersScreen() {
  const { colors } = useColorScheme();
  const [orders, setOrders] = useState<RecurringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<{ data: RecurringOrder[] }>(
        "/api/recurring-orders"
      );
      setOrders(res.data);
    } catch {
      // Keep last known data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleToggle = async (order: RecurringOrder, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, isActive: value } : o))
    );
    setTogglingIds((prev) => new Set(prev).add(order.id));

    try {
      await api.patch(`/api/recurring-orders/${order.id}`, { isActive: value });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({
        title: value ? "Aktiviert" : "Deaktiviert",
        message: order.name,
        preset: "done",
      });
    } catch {
      // Revert on error
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, isActive: !value } : o
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({ title: "Fehler beim Umschalten", preset: "error" });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Title */}
        <Text variant="largeTitle" className="font-bold">
          Wiederkehrende Bestellungen
        </Text>

        {/* Content */}
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : orders.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Ionicons name="repeat-outline" size={48} color={colors.grey3} />
            <Text className="text-muted-foreground text-sm">
              Keine wiederkehrenden Bestellungen vorhanden
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {orders.map((order) => (
              <RecurringOrderCard
                key={order.id}
                order={order}
                toggling={togglingIds.has(order.id)}
                onToggle={(value) => handleToggle(order, value)}
                primaryColor={colors.primary}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── RecurringOrderCard ─────────────────────────────────────────────────

function RecurringOrderCard({
  order,
  toggling,
  onToggle,
  primaryColor,
}: {
  order: RecurringOrder;
  toggling: boolean;
  onToggle: (value: boolean) => void;
  primaryColor: string;
}) {
  const freqColors = getFrequencyColor(order.frequency);

  return (
    <View
      style={[
        styles.card,
        !order.isActive && { opacity: 0.6 },
      ]}
    >
      <View className="flex-row items-start gap-3">
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: freqColors.bg }]}>
          <Ionicons name="repeat" size={22} color={freqColors.color} />
        </View>

        {/* Info */}
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-[15px]" numberOfLines={1}>
            {order.name}
          </Text>

          {order.supplierName && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="business-outline" size={13} color="#6b7280" />
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {order.supplierName}
              </Text>
            </View>
          )}

          <View className="flex-row items-center gap-2 mt-1">
            {/* Frequency badge */}
            <View
              style={[styles.badge, { backgroundColor: freqColors.bg }]}
            >
              <Text
                style={{
                  color: freqColors.color,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {getFrequencyLabel(order.frequency)}
              </Text>
            </View>

            {/* Next run */}
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
              <Text className="text-xs text-muted-foreground">
                {formatDate(order.nextRunDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Toggle */}
        <View className="items-center justify-center">
          {toggling ? (
            <ActivityIndicator size="small" />
          ) : (
            <Switch
              value={order.isActive}
              onValueChange={onToggle}
              trackColor={{ true: primaryColor }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
