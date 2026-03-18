import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { ScrollView, View, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "burnt";

import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { Text } from "@/components/nativewindui/Text";
import {
  getCommission,
  getCommissionEntries,
  updateCommission,
  type Commission,
  type CommissionEntry,
} from "@/lib/api";

const STATUS_NEXT: Record<string, { action: string; next: string } | null> = {
  open: { action: "Starten", next: "in_progress" },
  in_progress: { action: "Abschliessen", next: "completed" },
  completed: null,
  cancelled: null,
};

const STATUS_COLORS: Record<string, string> = {
  open: "#f97316",
  in_progress: "#0d9488",
  completed: "#16a34a",
  cancelled: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
};

export default function CommissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [commission, setCommission] = useState<Commission | null>(null);
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [c, e] = await Promise.all([
        getCommission(id),
        getCommissionEntries(id),
      ]);
      setCommission(c);
      setEntries(e.data);
    } catch {
      toast({ title: "Fehler beim Laden", preset: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update nav title once commission is loaded
  useLayoutEffect(() => {
    if (commission) {
      navigation.setOptions({ title: commission.name });
    }
  }, [commission, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  async function handleAdvanceStatus() {
    if (!commission) return;
    const next = STATUS_NEXT[commission.status];
    if (!next) return;

    Alert.alert(
      next.action,
      `Lieferschein "${commission.name}" ${next.action.toLowerCase()}?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: next.action,
          onPress: async () => {
            setAdvancing(true);
            try {
              const updated = await updateCommission(commission.id, { status: next.next });
              setCommission(updated);
              toast({ title: `Status: ${STATUS_LABELS[next.next]}`, preset: "done" });
            } catch {
              toast({ title: "Fehler", preset: "error" });
            } finally {
              setAdvancing(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!commission) {
    return (
      <View className="flex-1 items-center justify-center bg-background gap-3">
        <Text className="text-muted-foreground">Lieferschein nicht gefunden</Text>
        <Button variant="tonal" onPress={() => router.back()}>
          <Text>Zurück</Text>
        </Button>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[commission.status] ?? "#6b7280";
  const nextAction = STATUS_NEXT[commission.status];
  const isEditable = commission.status === "open" || commission.status === "in_progress";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-4 pb-10 gap-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Commission header */}
      <Card className="p-4 gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text variant="heading">{commission.name}</Text>
            {commission.number ? (
              <Text className="text-xs text-muted-foreground">Lieferschein #{commission.number}</Text>
            ) : null}
          </View>
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${statusColor}20` }}>
            <Text className="text-xs font-semibold" style={{ color: statusColor }}>
              {STATUS_LABELS[commission.status] ?? commission.status}
            </Text>
          </View>
        </View>
        {commission.targetLocationName ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-muted-foreground">{commission.targetLocationName}</Text>
          </View>
        ) : null}
        {commission.responsibleName ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="person-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-muted-foreground">{commission.responsibleName}</Text>
          </View>
        ) : null}
      </Card>

      {/* Actions */}
      <View className="flex-row gap-2">
        {isEditable && (
          <Button
            className="flex-1"
            variant="tonal"
            onPress={() => router.push(`/(app)/commissions/scan-modal?commissionId=${commission.id}`)}
          >
            <Ionicons name="barcode-outline" size={16} color="#f97316" />
            <Text className="ml-1.5">Scannen</Text>
          </Button>
        )}
        {nextAction && (
          <Button className="flex-1" onPress={handleAdvanceStatus} disabled={advancing}>
            {advancing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white">{nextAction.action}</Text>
            )}
          </Button>
        )}
      </View>

      {/* Entries */}
      <View className="gap-2">
        <Text variant="subhead" className="font-semibold">
          Artikel ({entries.length})
        </Text>
        {entries.length === 0 ? (
          <Card className="p-6 items-center gap-2">
            <Ionicons name="cube-outline" size={36} color="#9ca3af" />
            <Text className="text-muted-foreground text-center text-sm">
              Noch keine Artikel.{isEditable ? " Scannen um hinzuzufügen." : ""}
            </Text>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="p-3">
              <View className="flex-row items-start gap-3">
                <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                  <Ionicons
                    name={entry.materialId ? "cube-outline" : "construct-outline"}
                    size={16}
                    color="#f97316"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-sm">
                    {entry.materialName ?? entry.toolName ?? "Unbekannt"}
                  </Text>
                  {(entry.materialNumber ?? entry.toolNumber) ? (
                    <Text className="text-xs text-muted-foreground">
                      #{entry.materialNumber ?? entry.toolNumber}
                    </Text>
                  ) : null}
                </View>
                <View className="items-end">
                  <Text className="font-semibold tabular-nums">
                    {entry.pickedQuantity}/{entry.quantity}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {entry.materialUnit ?? "Stk"}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}
