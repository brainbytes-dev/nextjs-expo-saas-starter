import { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "burnt";

import { Button } from "@/components/nativewindui/Button";
import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { type ScanResult } from "@/lib/api";
import { stockIn, stockOut, toolCheckout, toolCheckin } from "@/lib/scan-actions";

interface ScanResultSheetProps {
  result: ScanResult | null;
  onDismiss: () => void;
  onAddToCommission?: (itemType: "material" | "tool" | "key", itemId: string) => void;
}

export function ScanResultSheet({ result, onDismiss, onAddToCommission }: ScanResultSheetProps) {
  const [loading, setLoading] = useState(false);
  const visible = result !== null;

  const item = result?.item as Record<string, unknown> | null;
  const itemType = result?.type;

  async function runAction(action: () => Promise<unknown>, successMsg: string) {
    setLoading(true);
    try {
      await action();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: successMsg, preset: "done" });
      onDismiss();
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({
        title: "Fehler",
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
        preset: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleStockIn() {
    if (!item?.id || !item?.mainLocationId) {
      Alert.alert("Kein Lagerort", "Diesem Material ist kein Hauptlagerort zugeordnet.");
      return;
    }
    runAction(
      () => stockIn(item.id as string, item.mainLocationId as string, 1),
      "Eingebucht"
    );
  }

  function handleStockOut() {
    if (!item?.id || !item?.mainLocationId) {
      Alert.alert("Kein Lagerort", "Diesem Material ist kein Hauptlagerort zugeordnet.");
      return;
    }
    runAction(
      () => stockOut(item.id as string, item.mainLocationId as string, 1),
      "Ausgebucht"
    );
  }

  function handleToolCheckout() {
    if (!item?.id) return;
    runAction(() => toolCheckout(item.id as string), "Werkzeug ausgebucht");
  }

  function handleToolCheckin() {
    if (!item?.id) return;
    runAction(() => toolCheckin(item.id as string), "Werkzeug eingebucht");
  }

  function handleAddToCommission() {
    if (!item?.id || !itemType) return;
    if (itemType === "key") {
      Alert.alert("Nicht unterstützt", "Schlüssel können nicht zu Lieferscheinen hinzugefügt werden.");
      return;
    }
    onAddToCommission?.(itemType, item.id as string);
    onDismiss();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet} className="bg-card">
        {/* Handle */}
        <View className="w-10 h-1 rounded-full bg-muted-foreground/30 self-center mb-4" />

        <ScrollView showsVerticalScrollIndicator={false}>
          {result?.type === null || !item ? (
            /* Not found */
            <View className="items-center py-8 gap-3">
              <Ionicons name="help-circle-outline" size={48} color="#6b7280" />
              <Text variant="heading" className="text-center">Nicht gefunden</Text>
              <Text className="text-muted-foreground text-center text-sm">
                Kein Material, Werkzeug oder Schlüssel mit diesem Barcode.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {/* Type badge + name */}
              <View className="gap-1.5">
                <View className="flex-row items-center gap-2">
                  <TypeBadge type={itemType!} />
                  {item.number ? (
                    <Text className="text-xs text-muted-foreground">#{item.number as string}</Text>
                  ) : null}
                </View>
                <Text variant="title1" className="font-bold">{item.name as string}</Text>
                {item.mainLocationName || item.assignedLocationId ? (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text className="text-sm text-muted-foreground">
                      {(item.mainLocationName ?? item.assignedLocationId) as string}
                    </Text>
                  </View>
                ) : null}
                {itemType === "material" && item.totalStock !== undefined ? (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="cube-outline" size={14} color="#6b7280" />
                    <Text className="text-sm text-muted-foreground">
                      Bestand: {item.totalStock as number} {(item.unit ?? "Stk") as string}
                    </Text>
                  </View>
                ) : null}
                {itemType === "tool" && item.condition ? (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="construct-outline" size={14} color="#6b7280" />
                    <Text className="text-sm text-muted-foreground capitalize">
                      Zustand: {item.condition as string}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Actions */}
              {loading ? (
                <View className="items-center py-4">
                  <ActivityIndicator />
                </View>
              ) : (
                <View className="gap-2">
                  {itemType === "material" && (
                    <>
                      <Button onPress={handleStockIn}>
                        <Ionicons name="arrow-down-circle-outline" size={16} color="white" />
                        <Text className="text-white ml-2">Einbuchen (+1)</Text>
                      </Button>
                      <Button variant="tonal" onPress={handleStockOut}>
                        <Ionicons name="arrow-up-circle-outline" size={16} color="#f97316" />
                        <Text className="ml-2">Ausbuchen (-1)</Text>
                      </Button>
                    </>
                  )}
                  {itemType === "tool" && (
                    <>
                      <Button onPress={handleToolCheckout}>
                        <Ionicons name="log-out-outline" size={16} color="white" />
                        <Text className="text-white ml-2">Ausbuchen</Text>
                      </Button>
                      <Button variant="tonal" onPress={handleToolCheckin}>
                        <Ionicons name="log-in-outline" size={16} color="#f97316" />
                        <Text className="ml-2">Einbuchen</Text>
                      </Button>
                    </>
                  )}
                  {onAddToCommission && itemType !== "key" && (
                    <Button variant="plain" onPress={handleAddToCommission}>
                      <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                      <Text className="text-muted-foreground ml-2">Zu Lieferschein hinzufügen</Text>
                    </Button>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Dismiss */}
          <TouchableOpacity onPress={onDismiss} className="mt-4 py-3 items-center">
            <Text className="text-muted-foreground text-sm">Schliessen &amp; weiter scannen</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function TypeBadge({ type }: { type: "material" | "tool" | "key" }) {
  const config = {
    material: { label: "Material", color: "#f97316", bg: "#fff7ed" },
    tool: { label: "Werkzeug", color: "#0d9488", bg: "#f0fdfa" },
    key: { label: "Schlüssel", color: "#6366f1", bg: "#eef2ff" },
  };
  const c = config[type];
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: c.bg }}>
      <Text className="text-xs font-semibold" style={{ color: c.color }}>
        {c.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
});
