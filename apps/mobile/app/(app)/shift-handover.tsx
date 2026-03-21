/**
 * Schichtuebergabe — Shift Handover Screen
 *
 * Shift selector, date picker, auto-populated data from API,
 * notes input, and email send button.
 * API: GET /api/shift-handover?date=X&shift=Y, POST /api/shift-handover/send
 */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { Text } from "@/components/nativewindui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShiftType = "frueh" | "spaet" | "nacht";

interface ShiftData {
  stockChanges: { id: string; materialName: string; changeType: string; quantity: number; locationName: string }[];
  toolBookings: { id: string; toolName: string; bookingType: string; userName: string }[];
  openCommissions: number;
  openOrders: number;
}

const SHIFTS: { key: ShiftType; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; time: string }[] = [
  { key: "frueh", label: "Fruehschicht", icon: "sunny", time: "06:00 - 14:00" },
  { key: "spaet", label: "Spaetschicht", icon: "partly-sunny", time: "14:00 - 22:00" },
  { key: "nacht", label: "Nachtschicht", icon: "moon", time: "22:00 - 06:00" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ShiftHandoverScreen() {
  const { colors } = useColorScheme();

  const [selectedShift, setSelectedShift] = useState<ShiftType>("frueh");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shiftData, setShiftData] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  // ── Fetch Data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const dateParam = formatDateParam(selectedDate);
      const res = await api.get<ShiftData>(
        `/api/shift-handover?date=${dateParam}&shift=${selectedShift}`
      );
      setShiftData(res);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden der Schichtdaten");
      setShiftData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedShift]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Shift Selection ─────────────────────────────────────────────────

  function selectShift(shift: ShiftType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedShift(shift);
  }

  // ── Date Navigation ──────────────────────────────────────────────────

  function goToPreviousDay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  }

  function goToNextDay() {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next > new Date()) return; // Don't go beyond today
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(next);
  }

  function goToToday() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(new Date());
  }

  const isToday =
    formatDateParam(selectedDate) === formatDateParam(new Date());

  // ── Send Email ──────────────────────────────────────────────────────

  async function sendEmail() {
    if (sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.post("/api/shift-handover/send", {
        date: formatDateParam(selectedDate),
        shift: selectedShift,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Gesendet", "Schichtuebergabe wurde per E-Mail gesendet.");
      setNotes("");
    } catch (e: any) {
      Alert.alert("Fehler", e.message || "E-Mail konnte nicht gesendet werden");
    } finally {
      setSending(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: "Schichtuebergabe",
          headerBackTitle: "Zurueck",
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
          {/* ── Shift Selector ──────────────────────────────── */}
          <View className="gap-2">
            <Text variant="subhead" className="font-semibold">
              Schicht
            </Text>
            <View className="flex-row gap-2">
              {SHIFTS.map((shift) => (
                <TouchableOpacity
                  key={shift.key}
                  className={`flex-1 rounded-xl py-3 items-center gap-1 border ${
                    selectedShift === shift.key
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                  onPress={() => selectShift(shift.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={shift.icon}
                    size={22}
                    color={
                      selectedShift === shift.key
                        ? colors.primary
                        : colors.grey2
                    }
                  />
                  <Text
                    className={`text-xs font-medium ${
                      selectedShift === shift.key
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {shift.label}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">
                    {shift.time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Date Selector ──────────────────────────────── */}
          <View className="gap-2">
            <Text variant="subhead" className="font-semibold">
              Datum
            </Text>
            <Card className="p-3 flex-row items-center justify-between">
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-background items-center justify-center"
                onPress={goToPreviousDay}
              >
                <Ionicons name="chevron-back" size={20} color={colors.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 items-center gap-0.5"
                onPress={goToToday}
                disabled={isToday}
              >
                <Text className="text-base font-semibold text-foreground">
                  {formatDateDisplay(selectedDate)}
                </Text>
                {!isToday && (
                  <Text className="text-xs text-primary font-medium">
                    Heute anzeigen
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-background items-center justify-center"
                onPress={goToNextDay}
                disabled={isToday}
                style={{ opacity: isToday ? 0.3 : 1 }}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </Card>
          </View>

          {/* ── Loading / Error ─────────────────────────────── */}
          {loading && (
            <View className="items-center py-8">
              <ActivityIndicator />
              <Text className="text-muted-foreground mt-2 text-sm">
                Lade Schichtdaten...
              </Text>
            </View>
          )}

          {error && !loading && (
            <Card className="p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="text-destructive flex-1 text-sm">{error}</Text>
              </View>
              <Button
                variant="plain"
                className="mt-2"
                onPress={() => {
                  setLoading(true);
                  fetchData();
                }}
              >
                <Text className="text-primary text-sm font-medium">
                  Erneut versuchen
                </Text>
              </Button>
            </Card>
          )}

          {/* ── Shift Data ──────────────────────────────────── */}
          {shiftData && !loading && !error && (
            <>
              {/* Overview cards */}
              <View className="flex-row gap-3">
                <Card className="flex-1 p-4 items-center gap-1">
                  <Ionicons name="document-text" size={22} color="#f97316" />
                  <Text className="text-2xl font-bold tabular-nums">
                    {shiftData.openCommissions}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Offene Kommissionen
                  </Text>
                </Card>
                <Card className="flex-1 p-4 items-center gap-1">
                  <Ionicons name="cart" size={22} color="#6366f1" />
                  <Text className="text-2xl font-bold tabular-nums">
                    {shiftData.openOrders}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Offene Bestellungen
                  </Text>
                </Card>
              </View>

              {/* Bestandsaenderungen */}
              <Card className="p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="subhead" className="font-semibold">
                    Bestandsaenderungen heute
                  </Text>
                  <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                    <Text className="text-orange-600 dark:text-orange-400 text-xs font-medium">
                      {shiftData.stockChanges.length}
                    </Text>
                  </View>
                </View>
                {shiftData.stockChanges.length === 0 ? (
                  <Text className="text-muted-foreground text-sm">
                    Keine Bestandsaenderungen
                  </Text>
                ) : (
                  shiftData.stockChanges.map((change) => (
                    <View
                      key={change.id}
                      className="flex-row items-center gap-3 py-1.5 border-t border-border/50"
                    >
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center ${
                          change.changeType === "in"
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        <Ionicons
                          name={
                            change.changeType === "in"
                              ? "arrow-down"
                              : "arrow-up"
                          }
                          size={14}
                          color={
                            change.changeType === "in" ? "#16a34a" : "#ef4444"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium" numberOfLines={1}>
                          {change.materialName}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {change.locationName}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm font-semibold tabular-nums ${
                          change.changeType === "in"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {change.changeType === "in" ? "+" : "-"}
                        {change.quantity}
                      </Text>
                    </View>
                  ))
                )}
              </Card>

              {/* Werkzeugbuchungen */}
              <Card className="p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="subhead" className="font-semibold">
                    Werkzeugbuchungen heute
                  </Text>
                  <View className="bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">
                    <Text className="text-teal-600 dark:text-teal-400 text-xs font-medium">
                      {shiftData.toolBookings.length}
                    </Text>
                  </View>
                </View>
                {shiftData.toolBookings.length === 0 ? (
                  <Text className="text-muted-foreground text-sm">
                    Keine Werkzeugbuchungen
                  </Text>
                ) : (
                  shiftData.toolBookings.map((booking) => (
                    <View
                      key={booking.id}
                      className="flex-row items-center gap-3 py-1.5 border-t border-border/50"
                    >
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center ${
                          booking.bookingType === "checkout"
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-blue-100 dark:bg-blue-900/30"
                        }`}
                      >
                        <Ionicons
                          name={
                            booking.bookingType === "checkout"
                              ? "log-out"
                              : "log-in"
                          }
                          size={14}
                          color={
                            booking.bookingType === "checkout"
                              ? "#d97706"
                              : "#2563eb"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium" numberOfLines={1}>
                          {booking.toolName}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {booking.userName}
                        </Text>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          booking.bookingType === "checkout"
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-blue-100 dark:bg-blue-900/30"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-medium ${
                            booking.bookingType === "checkout"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {booking.bookingType === "checkout"
                            ? "Entnommen"
                            : "Zurueckgegeben"}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </Card>

              {/* Hinweise */}
              <View className="gap-2">
                <Text variant="subhead" className="font-semibold">
                  Hinweise
                </Text>
                <TextInput
                  className="border border-border rounded-xl px-4 py-3 text-foreground bg-card min-h-[100]"
                  placeholder="Besondere Vorkommnisse, Hinweise fuer die naechste Schicht..."
                  placeholderTextColor={colors.grey2}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                  style={{ color: colors.foreground }}
                />
              </View>

              {/* Send Button */}
              <TouchableOpacity
                className="bg-primary rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                onPress={sendEmail}
                disabled={sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="mail" size={20} color="#fff" />
                    <Text className="text-white font-bold text-base">
                      Per E-Mail senden
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Empty state when no shift data and no error */}
          {!shiftData && !loading && !error && (
            <Card className="p-6 items-center gap-2">
              <Ionicons
                name="clipboard-outline"
                size={36}
                color={colors.grey2}
              />
              <Text className="text-muted-foreground text-sm text-center">
                Keine Daten fuer diese Schicht verfuegbar
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
