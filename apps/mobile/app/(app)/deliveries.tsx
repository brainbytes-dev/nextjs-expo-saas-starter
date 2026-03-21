import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "burnt";

import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Button } from "@/components/nativewindui/Button";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";
import type { DeliveryTracking } from "@/lib/api-types";

// ── Status config ─────────────────────────────────────────────────────

type DeliveryStatus = "ordered" | "confirmed" | "shipped" | "in_transit" | "delivered";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  ordered: { label: "Bestellt", color: "#6366f1", bg: "#eef2ff", icon: "cart" },
  confirmed: { label: "Bestätigt", color: "#0ea5e9", bg: "#f0f9ff", icon: "checkmark-circle" },
  shipped: { label: "Versendet", color: "#f97316", bg: "#fff7ed", icon: "paper-plane" },
  in_transit: { label: "Unterwegs", color: "#eab308", bg: "#fefce8", icon: "bus" },
  delivered: { label: "Geliefert", color: "#16a34a", bg: "#f0fdf4", icon: "checkmark-done" },
};

const FILTER_TABS = [
  { key: "all", label: "Alle" },
  { key: "ordered", label: "Bestellt" },
  { key: "in_transit", label: "Unterwegs" },
  { key: "delivered", label: "Geliefert" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

const STATUS_FLOW: DeliveryStatus[] = ["ordered", "confirmed", "shipped", "in_transit", "delivered"];

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "---";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(iso: string | null) {
  if (!iso) return "---";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
}

function isOverdue(delivery: DeliveryTracking): boolean {
  if (delivery.status === "delivered") return false;
  if (!delivery.expectedDeliveryDate) return false;
  return new Date(delivery.expectedDeliveryDate) < new Date();
}

function getStatusIndex(status: string): number {
  return STATUS_FLOW.indexOf(status as DeliveryStatus);
}

function getNextStatuses(current: string): DeliveryStatus[] {
  const idx = getStatusIndex(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return [];
  return STATUS_FLOW.slice(idx + 1);
}

// ── Screen ────────────────────────────────────────────────────────────

export default function DeliveriesScreen() {
  const { colors } = useColorScheme();
  const [deliveries, setDeliveries] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryTracking | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await api.get<{ data: DeliveryTracking[] }>(
        "/api/deliveries?limit=50"
      );
      setDeliveries(res.data);
    } catch {
      // Keep last known data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries();
  }, [fetchDeliveries]);

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === "all") return true;
    if (filter === "in_transit") return d.status === "shipped" || d.status === "in_transit";
    return d.status === filter;
  });

  const handleStatusChange = async (delivery: DeliveryTracking, newStatus: DeliveryStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/api/deliveries/${delivery.id}`, { status: newStatus });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: `Status geändert: ${STATUS_CONFIG[newStatus]?.label ?? newStatus}` });
      // Update local state
      const updated = { ...delivery, status: newStatus };
      setDeliveries((prev) =>
        prev.map((d) => (d.id === delivery.id ? updated : d))
      );
      setSelectedDelivery(updated);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({ title: "Fehler beim Statuswechsel", preset: "error" });
    } finally {
      setUpdating(false);
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
          Lieferungen
        </Text>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(tab.key);
                }}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.grey4,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : colors.foreground,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : filteredDeliveries.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Ionicons name="cube-outline" size={48} color={colors.grey3} />
            <Text className="text-muted-foreground text-sm">
              Keine Lieferungen gefunden
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredDeliveries.map((d) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDelivery(d);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          visible={!!selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onStatusChange={handleStatusChange}
          updating={updating}
        />
      )}
    </SafeAreaView>
  );
}

// ── DeliveryCard ──────────────────────────────────────────────────────

function DeliveryCard({
  delivery,
  onPress,
}: {
  delivery: DeliveryTracking;
  onPress: () => void;
}) {
  const overdue = isOverdue(delivery);
  const cfg = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.ordered;

  return (
    <TouchableOpacity
      style={[styles.card, overdue && styles.cardOverdue]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View className="flex-row items-center gap-3">
        {/* Status icon */}
        <View
          style={[
            styles.statusIconWrap,
            { backgroundColor: overdue ? "#fef2f2" : cfg.bg },
          ]}
        >
          <Ionicons
            name={overdue ? "alert-circle" : cfg.icon}
            size={22}
            color={overdue ? "#ef4444" : cfg.color}
          />
        </View>

        {/* Info */}
        <View className="flex-1 gap-0.5">
          <Text className="font-semibold text-[15px]" numberOfLines={1}>
            {delivery.orderNumber ?? `Bestellung #${delivery.orderId.slice(0, 8)}`}
          </Text>
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {delivery.supplierName ?? "Unbekannter Lieferant"}
          </Text>
        </View>

        {/* Right side */}
        <View className="items-end gap-1">
          <StatusBadge status={delivery.status} />
          <Text
            className="text-xs"
            style={{ color: overdue ? "#ef4444" : "#9ca3af" }}
          >
            {overdue ? "Überfällig" : formatDateShort(delivery.expectedDeliveryDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ordered;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ── DeliveryDetailModal ──────────────────────────────────────────────

function DeliveryDetailModal({
  delivery,
  visible,
  onClose,
  onStatusChange,
  updating,
}: {
  delivery: DeliveryTracking;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (delivery: DeliveryTracking, status: DeliveryStatus) => void;
  updating: boolean;
}) {
  const { colors } = useColorScheme();
  const overdue = isOverdue(delivery);
  const nextStatuses = getNextStatuses(delivery.status);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/30">
          <Text variant="heading" className="font-bold">
            Lieferung
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close-circle" size={28} color={colors.grey2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        >
          {/* Order Info */}
          <View style={styles.section}>
            <Text variant="subhead" className="font-semibold mb-2">
              Bestellinformationen
            </Text>
            <InfoRow label="Bestellnummer" value={delivery.orderNumber ?? "---"} />
            <InfoRow label="Lieferant" value={delivery.supplierName ?? "---"} />
            <InfoRow label="Spediteur" value={delivery.carrier ?? "---"} />
            <InfoRow label="Sendungsnummer" value={delivery.trackingNumber ?? "---"} />
            <InfoRow label="Erwartete Lieferung" value={formatDate(delivery.expectedDeliveryDate)} />
            <InfoRow label="Tatsächliche Lieferung" value={formatDate(delivery.actualDeliveryDate)} />
            {overdue && (
              <View className="flex-row items-center gap-2 mt-1 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>
                  Überfällig
                </Text>
              </View>
            )}
          </View>

          {/* Status Timeline */}
          <View style={styles.section}>
            <Text variant="subhead" className="font-semibold mb-3">
              Status-Verlauf
            </Text>
            <StatusTimeline currentStatus={delivery.status} />
          </View>

          {/* Notes */}
          {delivery.notes && (
            <View style={styles.section}>
              <Text variant="subhead" className="font-semibold mb-2">
                Notizen
              </Text>
              <Text className="text-sm text-muted-foreground">{delivery.notes}</Text>
            </View>
          )}

          {/* Status Change Buttons */}
          {nextStatuses.length > 0 && (
            <View style={styles.section}>
              <Text variant="subhead" className="font-semibold mb-3">
                Status ändern
              </Text>
              <View style={{ gap: 10 }}>
                {nextStatuses.map((status) => {
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusButton, { borderColor: cfg.color }]}
                      onPress={() => onStatusChange(delivery, status)}
                      disabled={updating}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                      <Text style={{ color: cfg.color, fontWeight: "600", fontSize: 15 }}>
                        {cfg.label}
                      </Text>
                      {updating && <ActivityIndicator size="small" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <Text className="text-xs text-muted-foreground">
              Erstellt: {formatDate(delivery.createdAt)}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── StatusTimeline ────────────────────────────────────────────────────

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = getStatusIndex(currentStatus);

  return (
    <View style={{ gap: 0 }}>
      {STATUS_FLOW.map((status, idx) => {
        const cfg = STATUS_CONFIG[status];
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === STATUS_FLOW.length - 1;

        return (
          <View key={status} className="flex-row" style={{ minHeight: 48 }}>
            {/* Dot + Line */}
            <View className="items-center" style={{ width: 32 }}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isCompleted ? cfg.color : "#d1d5db",
                    borderColor: isCurrent ? cfg.color : "transparent",
                    borderWidth: isCurrent ? 3 : 0,
                  },
                ]}
              >
                {isCompleted && !isCurrent && (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor: idx < currentIdx ? cfg.color : "#e5e7eb",
                    },
                  ]}
                />
              )}
            </View>

            {/* Label */}
            <View className="flex-1 pb-3 pl-2">
              <Text
                style={{
                  fontWeight: isCurrent ? "700" : "500",
                  fontSize: 14,
                  color: isCompleted ? cfg.color : "#9ca3af",
                }}
              >
                {cfg.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5 border-b border-border/20">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium" numberOfLines={1} style={{ maxWidth: "55%" }}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: {
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)",
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
  cardOverdue: {
    borderColor: "#fca5a5",
    borderWidth: 1.5,
  },
  statusIconWrap: {
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
  section: {
    gap: 0,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
  },
});
