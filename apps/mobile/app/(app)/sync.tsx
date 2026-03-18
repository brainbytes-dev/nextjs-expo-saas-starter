import { useState, useCallback } from "react";
import { ScrollView, View, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "burnt";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { ConflictModal } from "@/components/conflict-modal";
import { useQueue, flushQueue, clearQueue } from "@/lib/offline-queue";
import { useConflicts, clearAllConflicts } from "@/lib/conflict-resolver";
import { useIsOnline } from "@/lib/connectivity";

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Noch nie";
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `Vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  return `Vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
}

function StatusDot({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
      }}
    />
  );
}

export default function SyncScreen() {
  const online = useIsOnline();
  const { queue, pendingCount } = useQueue();
  const { conflicts, unresolvedCount, lastSyncAt } = useConflicts();
  const [syncing, setSyncing] = useState(false);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualSync = useCallback(async () => {
    if (!online) {
      toast({
        title: "Kein Internet",
        message: "Bitte stelle eine Internetverbindung her.",
        preset: "error",
      });
      return;
    }
    setSyncing(true);
    try {
      await flushQueue();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: "Synchronisierung abgeschlossen", preset: "done" });
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({
        title: "Synchronisierung fehlgeschlagen",
        message: "Bitte versuche es erneut.",
        preset: "error",
      });
    } finally {
      setSyncing(false);
    }
  }, [online]);

  const handleClearQueue = useCallback(() => {
    clearQueue();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toast({ title: "Warteschlange geleert", preset: "done" });
  }, []);

  const handleClearConflicts = useCallback(() => {
    clearAllConflicts();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toast({ title: "Konflikte gelöscht", preset: "done" });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (online) await flushQueue();
    setRefreshing(false);
  }, [online]);

  // Determine overall sync health
  const syncColor =
    unresolvedCount > 0
      ? "#ef4444"
      : !online
      ? "#F59E0B"
      : pendingCount > 0
      ? "#3B82F6"
      : "#22c55e";

  const syncLabel =
    unresolvedCount > 0
      ? "Konflikte erkannt"
      : !online
      ? "Offline"
      : pendingCount > 0
      ? "Ausstehende Änderungen"
      : "Synchronisiert";

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Title */}
        <View className="flex-row items-center gap-2 mb-2">
          <Ionicons name="sync-circle-outline" size={28} color="#6b7280" />
          <Text variant="largeTitle" className="font-bold">
            Synchronisierung
          </Text>
        </View>

        {/* Status Overview Card */}
        <View className="bg-card border border-border rounded-2xl p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <StatusDot color={syncColor} />
            <Text className="text-base font-semibold">{syncLabel}</Text>
          </View>

          <View className="gap-2">
            <StatusRow
              icon="time-outline"
              label="Letzte Synchronisierung"
              value={formatRelativeTime(lastSyncAt)}
            />
            <StatusRow
              icon="wifi-outline"
              label="Verbindung"
              value={online ? "Online" : "Offline"}
              valueColor={online ? "#22c55e" : "#F59E0B"}
            />
            <StatusRow
              icon="hourglass-outline"
              label="Ausstehend"
              value={`${pendingCount} Änderung${pendingCount === 1 ? "" : "en"}`}
              valueColor={pendingCount > 0 ? "#3B82F6" : undefined}
            />
            <StatusRow
              icon="warning-outline"
              label="Konflikte"
              value={`${unresolvedCount} ungelöst`}
              valueColor={unresolvedCount > 0 ? "#ef4444" : undefined}
            />
          </View>
        </View>

        {/* Manual Sync Button */}
        <Button
          onPress={handleManualSync}
          disabled={syncing || !online}
        >
          {syncing ? (
            <ActivityIndicator size="small" />
          ) : (
            <Ionicons name="sync-outline" size={16} color="white" />
          )}
          <Text className="text-white ml-2">
            {syncing ? "Synchronisiere…" : "Jetzt synchronisieren"}
          </Text>
        </Button>

        {/* Conflicts Section */}
        {unresolvedCount > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Konflikte ({unresolvedCount})
            </Text>
            <TouchableOpacity
              onPress={() => setConflictModalVisible(true)}
              className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex-row items-center gap-3"
              accessibilityRole="button"
              accessibilityLabel="Konflikte lösen"
            >
              <View className="bg-red-100 dark:bg-red-900/40 rounded-full p-2">
                <Ionicons name="git-merge-outline" size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {unresolvedCount}{" "}
                  {unresolvedCount === 1 ? "Konflikt" : "Konflikte"} lösen
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Tippe um Konflikte manuell zu lösen
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Queue Section */}
        {queue.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Warteschlange ({pendingCount})
            </Text>
            <View className="bg-card border border-border rounded-2xl overflow-hidden">
              {queue.slice(0, 10).map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center px-4 py-3 gap-3 ${
                    index < queue.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <QueueTypeBadge type={item.type} />
                  <View className="flex-1">
                    <Text className="text-sm font-medium" numberOfLines={1}>
                      {item.path}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.method} · {item.retryCount > 0 ? `${item.retryCount}x versucht` : "Ausstehend"}
                    </Text>
                  </View>
                </View>
              ))}
              {queue.length > 10 && (
                <View className="px-4 py-3 border-t border-border">
                  <Text className="text-xs text-muted-foreground text-center">
                    und {queue.length - 10} weitere…
                  </Text>
                </View>
              )}
            </View>

            <Button variant="tonal" onPress={handleClearQueue}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <Text className="ml-1.5 text-destructive">Warteschlange leeren</Text>
            </Button>
          </View>
        )}

        {/* Conflict history — all (including resolved) */}
        {conflicts.length > 0 && unresolvedCount === 0 && (
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Erledigte Konflikte
              </Text>
              <TouchableOpacity onPress={handleClearConflicts}>
                <Text className="text-xs text-muted-foreground">Löschen</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-card border border-border rounded-2xl overflow-hidden">
              {conflicts.slice(0, 5).map((conflict, index) => {
                const name = conflict.serverState.name
                  ? String(conflict.serverState.name)
                  : conflict.queuedAction.path.split("/").at(-1) ?? "Eintrag";
                return (
                  <View
                    key={conflict.id}
                    className={`flex-row items-center px-4 py-3 gap-3 ${
                      index < conflicts.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium" numberOfLines={1}>
                        {name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {conflict.resolution === "keep_mine"
                          ? "Meine Version behalten"
                          : conflict.resolution === "keep_server"
                          ? "Server Version übernommen"
                          : "Zusammengeführt"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty state */}
        {pendingCount === 0 && unresolvedCount === 0 && (
          <View className="items-center py-8 gap-2">
            <Ionicons name="cloud-done-outline" size={48} color="#22c55e" />
            <Text className="text-base font-semibold text-foreground">
              Alles synchronisiert
            </Text>
            <Text className="text-sm text-muted-foreground text-center">
              Keine ausstehenden Änderungen oder Konflikte.
            </Text>
          </View>
        )}
      </ScrollView>

      <ConflictModal
        conflicts={conflicts.filter((c) => !c.resolution)}
        visible={conflictModalVisible}
        onClose={() => setConflictModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon as any} size={14} color="#6b7280" />
        <Text className="text-sm text-muted-foreground">{label}</Text>
      </View>
      <Text
        className="text-sm font-medium"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

const QUEUE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  "stock-change": { label: "Bestand", color: "#f97316", bg: "#fff7ed" },
  "tool-booking": { label: "Werkzeug", color: "#0d9488", bg: "#f0fdfa" },
  "commission-update": { label: "Lieferschein", color: "#6366f1", bg: "#eef2ff" },
  "commission-entry": { label: "Position", color: "#8b5cf6", bg: "#f5f3ff" },
};

function QueueTypeBadge({ type }: { type: string }) {
  const config = QUEUE_TYPE_CONFIG[type] ?? {
    label: type,
    color: "#6b7280",
    bg: "#f3f4f6",
  };
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: config.bg }}
    >
      <Text className="text-xs font-semibold" style={{ color: config.color }}>
        {config.label}
      </Text>
    </View>
  );
}
