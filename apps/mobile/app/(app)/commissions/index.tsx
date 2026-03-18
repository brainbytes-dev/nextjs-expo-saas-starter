import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "burnt";

import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader";
import { SegmentedControl } from "@/components/nativewindui/SegmentedControl";
import { Text } from "@/components/nativewindui/Text";
import { TextField } from "@/components/nativewindui/TextField";
import { getCommissions, createCommission, type Commission } from "@/lib/api";

const FILTER_OPTIONS = ["Offen", "In Bearbeitung", "Alle"];
const STATUS_MAP: Record<number, string[]> = {
  0: ["open"],
  1: ["in_progress"],
  2: ["open", "in_progress", "completed", "cancelled"],
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Offen", color: "#f97316", bg: "#fff7ed" },
  in_progress: { label: "In Bearbeitung", color: "#0d9488", bg: "#f0fdfa" },
  completed: { label: "Abgeschlossen", color: "#16a34a", bg: "#f0fdf4" },
  cancelled: { label: "Storniert", color: "#6b7280", bg: "#f9fafb" },
};

export default function CommissionsScreen() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterIndex, setFilterIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchCommissions = useCallback(async (index = filterIndex) => {
    try {
      const res = await getCommissions(STATUS_MAP[index] ?? ["open"]);
      setCommissions(res.data);
    } catch {
      toast({ title: "Fehler beim Laden", preset: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterIndex]);

  useEffect(() => {
    setLoading(true);
    fetchCommissions(filterIndex);
  }, [filterIndex]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCommissions();
  }, [fetchCommissions]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      Alert.alert("Name erforderlich", "Bitte gib einen Namen für den Lieferschein ein.");
      return;
    }
    try {
      const commission = await createCommission({ name });
      toast({ title: "Lieferschein erstellt", preset: "done" });
      setNewName("");
      setCreating(false);
      router.push(`/(app)/commissions/${commission.id}`);
    } catch (err) {
      toast({
        title: "Fehler",
        message: err instanceof Error ? err.message : "Konnte Lieferschein nicht erstellen",
        preset: "error",
      });
    }
  }

  return (
    <>
      <LargeTitleHeader
        title="Lieferscheine"
        backgroundColor="transparent"
        rightView={() => (
          <TouchableOpacity onPress={() => setCreating(true)} className="pr-1">
            <Ionicons name="add" size={28} color="#f97316" />
          </TouchableOpacity>
        )}
      />

      <SegmentedControl
        values={FILTER_OPTIONS}
        selectedIndex={filterIndex}
        onChange={(evt) => setFilterIndex(evt.nativeEvent.selectedSegmentIndex)}
        className="mx-4 mb-3"
      />

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-10 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* New commission form */}
        {creating && (
          <Card className="p-4 gap-3">
            <Text variant="subhead" className="font-semibold">Neuer Lieferschein</Text>
            <TextField
              placeholder="Name des Lieferscheins"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View className="flex-row gap-2">
              <Button className="flex-1" onPress={handleCreate}>
                <Text className="text-white">Erstellen</Text>
              </Button>
              <Button variant="plain" className="flex-1" onPress={() => { setCreating(false); setNewName(""); }}>
                <Text className="text-muted-foreground">Abbrechen</Text>
              </Button>
            </View>
          </Card>
        )}

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : commissions.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
            <Text className="text-muted-foreground text-center">
              Keine Lieferscheine vorhanden
            </Text>
            <Button variant="tonal" onPress={() => setCreating(true)}>
              <Text>Ersten erstellen</Text>
            </Button>
          </View>
        ) : (
          commissions.map((c) => {
            const statusInfo = STATUS_LABELS[c.status] ?? STATUS_LABELS.open;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push(`/(app)/commissions/${c.id}`)}
                activeOpacity={0.7}
              >
                <Card className="p-4 gap-2">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="font-semibold text-base">{c.name}</Text>
                      {c.number ? (
                        <Text className="text-xs text-muted-foreground">#{c.number}</Text>
                      ) : null}
                    </View>
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: statusInfo.bg }}>
                      <Text className="text-xs font-medium" style={{ color: statusInfo.color }}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-4">
                    {c.targetLocationName ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="location-outline" size={13} color="#9ca3af" />
                        <Text className="text-xs text-muted-foreground">{c.targetLocationName}</Text>
                      </View>
                    ) : null}
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="list-outline" size={13} color="#9ca3af" />
                      <Text className="text-xs text-muted-foreground">{c.entryCount} Artikel</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
