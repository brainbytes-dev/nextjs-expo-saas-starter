/**
 * Zeiterfassung — Time Tracking Screen
 *
 * Active timer with live clock, start/stop flow, recent entries, and weekly stats.
 * API: GET /api/time-entries, POST /api/time-entries, PATCH /api/time-entries/[id]
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
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

interface TimeEntry {
  id: string;
  commissionId?: string;
  commissionName?: string;
  description?: string;
  startedAt: string;
  stoppedAt?: string | null;
  durationMinutes?: number;
  billable: boolean;
}

interface Commission {
  id: string;
  name: string;
}

interface TimeStats {
  todayHours: number;
  weekHours: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  return m > 0 ? `${h} Std ${m} Min` : `${h} Std`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TimeTrackingScreen() {
  const { colors } = useColorScheme();

  // State
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [stats, setStats] = useState<TimeStats>({ todayHours: 0, weekHours: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start flow
  const [showStartForm, setShowStartForm] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Live clock
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch Data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [entriesRes, statsRes] = await Promise.all([
        api.get<{ data: TimeEntry[] }>("/api/time-entries?limit=20"),
        api.get<TimeStats>("/api/time-entries/stats"),
      ]);

      const allEntries = entriesRes.data || [];
      const active = allEntries.find((e) => !e.stoppedAt) || null;
      const completed = allEntries.filter((e) => e.stoppedAt);

      setActiveEntry(active);
      setEntries(completed);
      setStats(statsRes);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden der Zeiteintraege");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Live Clock ──────────────────────────────────────────────────────

  useEffect(() => {
    if (activeEntry) {
      const start = new Date(activeEntry.startedAt).getTime();

      const tick = () => {
        const now = Date.now();
        setElapsed(Math.floor((now - start) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeEntry]);

  // ── Refresh ─────────────────────────────────────────────────────────

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Start Timer ─────────────────────────────────────────────────────

  async function openStartForm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowStartForm(true);
    try {
      const res = await api.get<{ data: Commission[] }>(
        "/api/commissions?status=open&status=in_progress"
      );
      setCommissions(res.data || []);
    } catch {
      setCommissions([]);
    }
  }

  async function startTimer() {
    if (starting) return;
    setStarting(true);
    try {
      const body: Record<string, unknown> = {
        description: description.trim() || undefined,
        billable,
        commissionId: selectedCommission?.id,
      };
      const entry = await api.post<TimeEntry>("/api/time-entries", body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveEntry(entry);
      setShowStartForm(false);
      setDescription("");
      setSelectedCommission(null);
      setBillable(true);
    } catch (e: any) {
      Alert.alert("Fehler", e.message || "Timer konnte nicht gestartet werden");
    } finally {
      setStarting(false);
    }
  }

  // ── Stop Timer ──────────────────────────────────────────────────────

  async function stopTimer() {
    if (!activeEntry || stopping) return;
    setStopping(true);
    try {
      await api.patch(`/api/time-entries/${activeEntry.id}`, { action: "stop" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveEntry(null);
      fetchData();
    } catch (e: any) {
      Alert.alert("Fehler", e.message || "Timer konnte nicht gestoppt werden");
    } finally {
      setStopping(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: "Zeiterfassung",
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
          {/* ── Loading ─────────────────────────────────────────── */}
          {loading && (
            <View className="items-center py-12">
              <ActivityIndicator />
              <Text className="text-muted-foreground mt-2 text-sm">
                Lade Zeiteintraege...
              </Text>
            </View>
          )}

          {/* ── Error ───────────────────────────────────────────── */}
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

          {!loading && !error && (
            <>
              {/* ── Active Timer ────────────────────────────────── */}
              {activeEntry ? (
                <Card className="overflow-hidden">
                  <View className="bg-primary/5 p-6 items-center gap-3">
                    <View className="flex-row items-center gap-2">
                      <View className="w-3 h-3 rounded-full bg-green-500" />
                      <Text className="text-sm font-medium text-green-600">
                        Timer laeuft
                      </Text>
                    </View>

                    <Text
                      style={{ fontVariant: ["tabular-nums"] }}
                      className="text-5xl font-bold text-foreground"
                    >
                      {formatDuration(elapsed)}
                    </Text>

                    {activeEntry.commissionName && (
                      <Text className="text-muted-foreground text-sm">
                        {activeEntry.commissionName}
                      </Text>
                    )}
                    {activeEntry.description && (
                      <Text className="text-muted-foreground text-xs">
                        {activeEntry.description}
                      </Text>
                    )}

                    <View className="flex-row items-center gap-2 mt-1">
                      {activeEntry.billable && (
                        <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                          <Text className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                            Verrechenbar
                          </Text>
                        </View>
                      )}
                      <Text className="text-muted-foreground text-xs">
                        Gestartet um {formatTime(activeEntry.startedAt)}
                      </Text>
                    </View>
                  </View>

                  <View className="p-4">
                    <TouchableOpacity
                      className="bg-red-500 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                      onPress={stopTimer}
                      disabled={stopping}
                      activeOpacity={0.8}
                    >
                      {stopping ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="stop-circle" size={22} color="#fff" />
                          <Text className="text-white font-bold text-base">
                            Stoppen
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              ) : showStartForm ? (
                /* ── Start Form ──────────────────────────────────── */
                <Card className="p-4 gap-4">
                  <Text variant="heading" className="font-semibold">
                    Timer starten
                  </Text>

                  {/* Commission selector */}
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-muted-foreground">
                      Kommission (optional)
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {commissions.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          className={`px-3 py-2 rounded-lg border ${
                            selectedCommission?.id === c.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card"
                          }`}
                          onPress={() =>
                            setSelectedCommission(
                              selectedCommission?.id === c.id ? null : c
                            )
                          }
                        >
                          <Text
                            className={`text-sm ${
                              selectedCommission?.id === c.id
                                ? "text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {commissions.length === 0 && (
                        <Text className="text-muted-foreground text-sm py-2">
                          Keine offenen Kommissionen
                        </Text>
                      )}
                    </ScrollView>
                  </View>

                  {/* Description */}
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-muted-foreground">
                      Beschreibung
                    </Text>
                    <TextInput
                      className="border border-border rounded-lg px-3 py-2.5 text-foreground bg-card"
                      placeholder="Was wird gemacht?"
                      placeholderTextColor={colors.grey2}
                      value={description}
                      onChangeText={setDescription}
                      style={{ color: colors.foreground }}
                    />
                  </View>

                  {/* Billable toggle */}
                  <TouchableOpacity
                    className="flex-row items-center justify-between py-2"
                    onPress={() => setBillable(!billable)}
                  >
                    <Text className="text-sm font-medium">Verrechenbar</Text>
                    <View
                      className={`w-12 h-7 rounded-full justify-center ${
                        billable ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full bg-white shadow-sm ${
                          billable ? "ml-6" : "ml-1"
                        }`}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Actions */}
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 border border-border rounded-xl py-3 items-center"
                      onPress={() => setShowStartForm(false)}
                    >
                      <Text className="text-muted-foreground font-medium">
                        Abbrechen
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-primary rounded-xl py-3 items-center flex-row justify-center gap-2"
                      onPress={startTimer}
                      disabled={starting}
                      activeOpacity={0.8}
                    >
                      {starting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="play" size={18} color="#fff" />
                          <Text className="text-white font-bold">Starten</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              ) : (
                /* ── Start Button ────────────────────────────────── */
                <TouchableOpacity
                  className="bg-primary rounded-2xl py-5 items-center flex-row justify-center gap-3"
                  onPress={openStartForm}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play-circle" size={28} color="#fff" />
                  <Text className="text-white font-bold text-lg">
                    Timer starten
                  </Text>
                </TouchableOpacity>
              )}

              {/* ── Stats ──────────────────────────────────────── */}
              <View className="flex-row gap-3">
                <Card className="flex-1 p-4 items-center gap-1">
                  <Ionicons name="today" size={22} color={colors.primary} />
                  <Text className="text-2xl font-bold tabular-nums">
                    {stats.todayHours.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Heute (Std)
                  </Text>
                </Card>
                <Card className="flex-1 p-4 items-center gap-1">
                  <Ionicons name="calendar" size={22} color={colors.primary} />
                  <Text className="text-2xl font-bold tabular-nums">
                    {stats.weekHours.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Diese Woche (Std)
                  </Text>
                </Card>
              </View>

              {/* ── Recent Entries ──────────────────────────────── */}
              <View className="gap-3">
                <Text variant="subhead" className="font-semibold">
                  Letzte Eintraege
                </Text>
                {entries.length === 0 ? (
                  <Card className="p-6 items-center gap-2">
                    <Ionicons
                      name="time-outline"
                      size={36}
                      color={colors.grey2}
                    />
                    <Text className="text-muted-foreground text-sm">
                      Noch keine Zeiteintraege vorhanden
                    </Text>
                  </Card>
                ) : (
                  entries.map((entry) => (
                    <TimeEntryRow key={entry.id} entry={entry} />
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ---------------------------------------------------------------------------
// TimeEntryRow
// ---------------------------------------------------------------------------

function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  return (
    <Card className="p-3 flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
        <Ionicons name="time" size={20} color="#6366f1" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium" numberOfLines={1}>
          {entry.description || entry.commissionName || "Zeiteintrag"}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatDate(entry.startedAt)} {formatTime(entry.startedAt)}
          {entry.stoppedAt ? ` - ${formatTime(entry.stoppedAt)}` : ""}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="text-sm font-semibold tabular-nums">
          {entry.durationMinutes
            ? formatDurationShort(entry.durationMinutes)
            : "--"}
        </Text>
        {entry.billable && (
          <View className="bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
            <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-medium">
              CHF
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}
