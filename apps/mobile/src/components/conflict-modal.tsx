import { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "burnt";

import { Button } from "@/components/nativewindui/Button";
import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import {
  type Conflict,
  resolveConflict,
  resolveAllKeepServer,
  resolveAllKeepMine,
} from "@/lib/conflict-resolver";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEntityName(conflict: Conflict): string {
  const body = conflict.queuedAction.body;
  if (body.name) return String(body.name);
  const serverState = conflict.serverState;
  if (serverState.name) return String(serverState.name);
  return conflict.queuedAction.path.split("/").filter(Boolean).slice(-1)[0] ?? "Eintrag";
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: "Name",
    status: "Status",
    notes: "Notizen",
    quantity: "Menge",
    condition: "Zustand",
    manufacturer: "Hersteller",
    unit: "Einheit",
    reorderLevel: "Mindestbestand",
    targetLocationId: "Zielort",
    customerId: "Kunde",
    assignedToId: "Zugeteilt an",
    assignedLocationId: "Zugeordneter Ort",
  };
  return labels[field] ?? field;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  return String(value);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldDiff({
  field,
  clientValue,
  serverValue,
}: {
  field: string;
  clientValue: unknown;
  serverValue: unknown;
}) {
  return (
    <View className="mb-2">
      <Text className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
        {formatFieldLabel(field)}
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1 bg-orange-50 dark:bg-orange-950/20 rounded-lg p-2.5 border border-orange-200 dark:border-orange-800">
          <Text className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mb-0.5">
            Meine Version
          </Text>
          <Text className="text-sm text-foreground" numberOfLines={3}>
            {formatValue(clientValue)}
          </Text>
        </View>
        <View className="flex-1 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
          <Text className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
            Server Version
          </Text>
          <Text className="text-sm text-foreground" numberOfLines={3}>
            {formatValue(serverValue)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ConflictCard({
  conflict,
  index,
  total,
  onResolved,
}: {
  conflict: Conflict;
  index: number;
  total: number;
  onResolved: (id: string) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const entityName = formatEntityName(conflict);

  async function handleResolve(resolution: "keep_mine" | "keep_server") {
    setResolving(true);
    try {
      await resolveConflict(conflict, resolution);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onResolved(conflict.id);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({
        title: "Fehler",
        message: "Konflikt konnte nicht gelöst werden.",
        preset: "error",
      });
    } finally {
      setResolving(false);
    }
  }

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-xs text-muted-foreground mb-0.5">
            Konflikt {index + 1} von {total}
          </Text>
          <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
            {entityName}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            wurde von jemand anderem geändert
          </Text>
        </View>
        <View className="bg-red-100 dark:bg-red-950/30 rounded-full p-1.5">
          <Ionicons name="warning-outline" size={16} color="#ef4444" />
        </View>
      </View>

      {/* Field diffs */}
      {conflict.conflictFields.map((field) => (
        <FieldDiff
          key={field}
          field={field}
          clientValue={conflict.queuedAction.body[field]}
          serverValue={conflict.serverState[field]}
        />
      ))}

      {/* Actions */}
      {resolving ? (
        <View className="items-center py-3">
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            className="flex-1 bg-orange-100 dark:bg-orange-900/30 rounded-xl py-2.5 items-center border border-orange-200 dark:border-orange-800"
            onPress={() => handleResolve("keep_mine")}
            accessibilityLabel="Meine Version behalten"
          >
            <Text className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              Meine behalten
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-xl py-2.5 items-center border border-blue-200 dark:border-blue-800"
            onPress={() => handleResolve("keep_server")}
            accessibilityLabel="Server Version übernehmen"
          >
            <Text className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              Server übernehmen
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface ConflictModalProps {
  conflicts: Conflict[];
  visible: boolean;
  onClose: () => void;
}

export function ConflictModal({ conflicts, visible, onClose }: ConflictModalProps) {
  const [resolving, setResolving] = useState(false);
  const [localConflicts, setLocalConflicts] = useState<Conflict[]>(conflicts);

  // Sync external prop changes (e.g. when a new conflict batch arrives)
  // into local state so dismissing one card is instant without waiting for
  // the parent to re-render.
  if (conflicts.length !== localConflicts.length) {
    setLocalConflicts(conflicts);
  }

  function handleCardResolved(id: string) {
    setLocalConflicts((prev) => prev.filter((c) => c.id !== id));
    if (localConflicts.length <= 1) {
      toast({ title: "Alle Konflikte gelöst", preset: "done" });
      onClose();
    }
  }

  async function handleResolveAllServer() {
    Alert.alert(
      "Alle mit Server überschreiben?",
      "Alle deine ausstehenden Änderungen werden verworfen. Die Server-Versionen bleiben erhalten.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Alle überschreiben",
          style: "destructive",
          onPress: async () => {
            setResolving(true);
            try {
              await resolveAllKeepServer();
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              toast({ title: "Alle Konflikte gelöst", preset: "done" });
              onClose();
            } catch {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              toast({
                title: "Fehler",
                message: "Nicht alle Konflikte konnten gelöst werden.",
                preset: "error",
              });
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  }

  async function handleResolveAllMine() {
    Alert.alert(
      "Alle eigenen Änderungen erzwingen?",
      "Alle deine Änderungen werden auf dem Server gespeichert — auch wenn sie älter sind.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Alle erzwingen",
          onPress: async () => {
            setResolving(true);
            try {
              await resolveAllKeepMine();
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              toast({ title: "Alle Änderungen gespeichert", preset: "done" });
              onClose();
            } catch {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              toast({
                title: "Fehler",
                message: "Nicht alle Änderungen konnten gespeichert werden.",
                preset: "error",
              });
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container} className="bg-background">
        {/* Header */}
        <View
          style={styles.header}
          className="bg-card border-b border-border"
        >
          <View className="flex-row items-center gap-2">
            <View className="bg-red-100 dark:bg-red-950/40 rounded-full p-1.5">
              <Ionicons name="git-merge-outline" size={18} color="#ef4444" />
            </View>
            <View>
              <Text variant="heading" className="font-bold">
                Konflikte
              </Text>
              <Text className="text-xs text-muted-foreground">
                {localConflicts.length}{" "}
                {localConflicts.length === 1 ? "Konflikt" : "Konflikte"} gefunden
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            accessibilityLabel="Schliessen"
          >
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {resolving ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground">Wird verarbeitet…</Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-sm text-muted-foreground mb-4">
                Diese Änderungen wurden offline vorgenommen, aber in der
                Zwischenzeit hat jemand anderes dieselben Einträge geändert.
                Wähle für jeden Konflikt, welche Version du behalten möchtest.
              </Text>

              {localConflicts.map((conflict, index) => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  index={index}
                  total={localConflicts.length}
                  onResolved={handleCardResolved}
                />
              ))}
            </ScrollView>

            {/* Batch actions */}
            {localConflicts.length > 1 && (
              <View
                style={styles.batchActions}
                className="bg-card border-t border-border"
              >
                <Text className="text-xs text-muted-foreground mb-2 text-center">
                  Alle gleichzeitig lösen
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    variant="tonal"
                    onPress={handleResolveAllServer}
                    style={styles.batchButton}
                  >
                    <Ionicons name="cloud-download-outline" size={14} color="#3b82f6" />
                    <Text className="text-sm ml-1">Server für alle</Text>
                  </Button>
                  <Button
                    variant="tonal"
                    onPress={handleResolveAllMine}
                    style={styles.batchButton}
                  >
                    <Ionicons name="phone-portrait-outline" size={14} color="#f97316" />
                    <Text className="text-sm ml-1">Meine für alle</Text>
                  </Button>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  batchActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  batchButton: {
    flex: 1,
  },
});
