import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SessionItem {
  id: string;
  token?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  isCurrent?: boolean;
}

interface SessionsResponse {
  sessions?: SessionItem[];
  data?: SessionItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseUserAgent(ua?: string): { device: string; browser: string } {
  if (!ua) return { device: "Unbekannt", browser: "" };

  let device = "Unbekanntes Gerät";
  let browser = "";

  // Device detection
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android";
  else if (/Macintosh|Mac OS/i.test(ua)) device = "Mac";
  else if (/Windows/i.test(ua)) device = "Windows PC";
  else if (/Linux/i.test(ua)) device = "Linux";

  // Browser detection
  if (/Expo|ReactNative/i.test(ua)) browser = "Mobile App";
  else if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edge/i.test(ua)) browser = "Edge";

  return { device, browser };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unbekannt";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unbekannt";
  }
}

function getDeviceIcon(ua?: string): keyof typeof Ionicons.glyphMap {
  if (!ua) return "phone-portrait-outline";
  if (/iPhone|iPad|Android|ReactNative|Expo/i.test(ua))
    return "phone-portrait-outline";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop-outline";
  return "globe-outline";
}

// ---------------------------------------------------------------------------
// Sessions Screen
// ---------------------------------------------------------------------------
export default function SessionsScreen() {
  const { colors } = useColorScheme();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");

  // ── Fetch sessions ──────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      setError("");
      const res = await api.get<SessionsResponse>("/api/sessions");
      const items = res.sessions || res.data || [];
      setSessions(items);
    } catch (err: any) {
      setError(err.message || "Sitzungen konnten nicht geladen werden");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSessions();
      setLoading(false);
    })();
  }, [fetchSessions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }, [fetchSessions]);

  // ── Revoke single session ───────────────────────────────────────────
  const handleRevoke = useCallback(
    (session: SessionItem) => {
      Alert.alert(
        "Sitzung beenden",
        "Möchtest du diese Sitzung wirklich beenden? Das Gerät wird abgemeldet.",
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Beenden",
            style: "destructive",
            onPress: async () => {
              setRevoking(session.id);
              try {
                await api.delete(`/api/sessions/${session.id}`);
                setSessions((prev) =>
                  prev.filter((s) => s.id !== session.id)
                );
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
              } catch (err: any) {
                Alert.alert(
                  "Fehler",
                  err.message || "Sitzung konnte nicht beendet werden"
                );
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
              } finally {
                setRevoking(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  // ── Revoke all other sessions ───────────────────────────────────────
  const handleRevokeAll = useCallback(() => {
    const otherCount = sessions.filter((s) => !s.isCurrent).length;
    if (otherCount === 0) {
      Alert.alert("Keine Sitzungen", "Es gibt keine anderen aktiven Sitzungen.");
      return;
    }

    Alert.alert(
      "Alle anderen beenden",
      `Möchtest du ${otherCount} andere Sitzung${otherCount > 1 ? "en" : ""} wirklich beenden?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Alle beenden",
          style: "destructive",
          onPress: async () => {
            setRevoking("all");
            try {
              await api.delete("/api/sessions");
              setSessions((prev) => prev.filter((s) => s.isCurrent));
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (err: any) {
              Alert.alert(
                "Fehler",
                err.message || "Sitzungen konnten nicht beendet werden"
              );
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
            } finally {
              setRevoking(null);
            }
          },
        },
      ]
    );
  }, [sessions]);

  const otherSessionsExist = sessions.some((s) => !s.isCurrent);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Aktive Sitzungen",
          headerStyle: { backgroundColor: colors.card },
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-12"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Loading ────────────────────────────────────────── */}
          {loading && (
            <View className="mt-20 items-center">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-4 text-muted-foreground">
                Sitzungen werden geladen...
              </Text>
            </View>
          )}

          {/* ── Error ──────────────────────────────────────────── */}
          {!loading && error ? (
            <View className="mt-12 mx-4 items-center">
              <View className="w-14 h-14 rounded-full bg-red-500/10 items-center justify-center mb-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color="#ef4444"
                />
              </View>
              <Text className="text-base font-semibold mb-1">Fehler</Text>
              <Text className="text-sm text-muted-foreground text-center mb-4">
                {error}
              </Text>
              <Button onPress={handleRefresh} variant="secondary" className="rounded-xl">
                <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                  Erneut versuchen
                </Text>
              </Button>
            </View>
          ) : null}

          {/* ── Empty ──────────────────────────────────────────── */}
          {!loading && !error && sessions.length === 0 && (
            <View className="mt-12 mx-4 items-center">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: `${colors.primary}15` }}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text className="text-base font-semibold mb-1">
                Keine Sitzungen
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                Es wurden keine aktiven Sitzungen gefunden.
              </Text>
            </View>
          )}

          {/* ── Session list ───────────────────────────────────── */}
          {!loading && !error && sessions.length > 0 && (
            <>
              <View className="mt-6 mx-4 mb-2">
                <Text className="text-sm text-muted-foreground">
                  {sessions.length} aktive Sitzung{sessions.length > 1 ? "en" : ""}
                </Text>
              </View>

              <View className="mx-4 rounded-xl bg-card overflow-hidden">
                {sessions.map((session, idx) => {
                  const { device, browser } = parseUserAgent(
                    session.userAgent
                  );
                  const icon = getDeviceIcon(session.userAgent);
                  const isLast = idx === sessions.length - 1;
                  const isRevoking = revoking === session.id || revoking === "all";

                  return (
                    <View key={session.id}>
                      <View className="flex-row items-center px-4 py-3.5">
                        {/* Device icon */}
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center mr-3"
                          style={{
                            backgroundColor: session.isCurrent
                              ? `${colors.primary}15`
                              : `${colors.grey2}20`,
                          }}
                        >
                          <Ionicons
                            name={icon}
                            size={20}
                            color={
                              session.isCurrent
                                ? colors.primary
                                : colors.grey2
                            }
                          />
                        </View>

                        {/* Details */}
                        <View className="flex-1 mr-2">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-semibold">
                              {device}
                            </Text>
                            {session.isCurrent && (
                              <View className="rounded-full bg-green-500/15 px-2 py-0.5">
                                <Text className="text-[10px] font-medium text-green-600">
                                  Aktuell
                                </Text>
                              </View>
                            )}
                          </View>
                          {browser ? (
                            <Text className="text-xs text-muted-foreground mt-0.5">
                              {browser}
                            </Text>
                          ) : null}
                          <View className="flex-row items-center gap-2 mt-0.5">
                            {session.ipAddress && (
                              <Text className="text-xs text-muted-foreground">
                                {session.ipAddress}
                              </Text>
                            )}
                            <Text className="text-xs text-muted-foreground">
                              {formatDate(
                                session.updatedAt || session.createdAt
                              )}
                            </Text>
                          </View>
                        </View>

                        {/* Revoke button (not for current session) */}
                        {!session.isCurrent && (
                          <Pressable
                            onPress={() => handleRevoke(session)}
                            disabled={isRevoking}
                            className="ml-2"
                          >
                            {isRevoking ? (
                              <ActivityIndicator
                                size="small"
                                color="#ef4444"
                              />
                            ) : (
                              <View className="rounded-lg bg-red-500/10 px-3 py-1.5">
                                <Text className="text-xs font-medium text-red-500">
                                  Abmelden
                                </Text>
                              </View>
                            )}
                          </Pressable>
                        )}
                      </View>
                      {!isLast && <View className="h-px bg-border ml-16" />}
                    </View>
                  );
                })}
              </View>

              {/* Revoke all others */}
              {otherSessionsExist && (
                <View className="mt-4 mx-4">
                  <Pressable
                    onPress={handleRevokeAll}
                    disabled={revoking === "all"}
                    className="rounded-xl bg-card overflow-hidden"
                  >
                    <View className="flex-row items-center justify-center px-4 py-3.5">
                      {revoking === "all" ? (
                        <ActivityIndicator
                          size="small"
                          color="#ef4444"
                          style={{ marginRight: 8 }}
                        />
                      ) : (
                        <Ionicons
                          name="log-out-outline"
                          size={18}
                          color="#ef4444"
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <Text className="text-sm font-medium text-red-500">
                        Alle anderen Sitzungen beenden
                      </Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {/* Info note */}
          {!loading && !error && sessions.length > 0 && (
            <View
              className="mt-6 mx-4 rounded-xl p-4"
              style={{ backgroundColor: `${colors.primary}10` }}
            >
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.primary }}
                >
                  Hinweis
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground leading-5">
                Hier siehst du alle Geräte, auf denen du angemeldet bist.
                Beende Sitzungen von Geräten, die du nicht mehr verwendest.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
