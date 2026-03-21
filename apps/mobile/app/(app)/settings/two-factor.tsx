import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step = "loading" | "enabled" | "intro" | "setup" | "verify" | "done";

interface TwoFactorStatus {
  enabled: boolean;
}

interface TwoFactorSetupResponse {
  totpURI: string;
  secret?: string;
}

interface TwoFactorVerifyResponse {
  recoveryCodes?: string[];
  backupCodes?: string[];
}

// ---------------------------------------------------------------------------
// Two-Factor Authentication Setup Screen
// ---------------------------------------------------------------------------
export default function TwoFactorScreen() {
  const { colors } = useColorScheme();

  const [step, setStep] = useState<Step>("loading");
  const [totpUri, setTotpUri] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Check 2FA status on mount ───────────────────────────────────────
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = useCallback(async () => {
    setStep("loading");
    try {
      const res = await api.get<TwoFactorStatus>(
        "/api/auth/two-factor/status"
      );
      setStep(res.enabled ? "enabled" : "intro");
    } catch {
      setStep("intro");
    }
  }, []);

  // ── Start setup ─────────────────────────────────────────────────────
  const handleStartSetup = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<TwoFactorSetupResponse>(
        "/api/auth/two-factor/setup",
        {}
      );
      setTotpUri(res.totpURI || "");
      // Extract secret from URI or use provided secret
      if (res.secret) {
        setSecret(res.secret);
      } else {
        const match = res.totpURI?.match(/secret=([A-Z2-7]+)/i);
        setSecret(match?.[1] || "");
      }
      setStep("setup");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      setError(err.message || "Setup fehlgeschlagen");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Verify code ─────────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError("Bitte gib einen 6-stelligen Code ein");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post<TwoFactorVerifyResponse>(
        "/api/auth/two-factor/verify",
        { code }
      );
      const codes = res.recoveryCodes || res.backupCodes || [];
      setRecoveryCodes(codes);
      setStep("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Ungültiger Code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [code]);

  // ── Disable 2FA ─────────────────────────────────────────────────────
  const handleDisable = useCallback(() => {
    Alert.alert(
      "2FA deaktivieren",
      "Möchtest du die Zwei-Faktor-Authentifizierung wirklich deaktivieren? Dein Konto ist danach weniger geschützt.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Deaktivieren",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.post("/api/auth/two-factor/disable", {});
              setStep("intro");
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (err: any) {
              Alert.alert("Fehler", err.message || "Deaktivierung fehlgeschlagen");
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, []);

  // ── Copy to clipboard ───────────────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Kopiert", "In die Zwischenablage kopiert");
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Zwei-Faktor-Auth",
          headerStyle: { backgroundColor: colors.card },
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-12"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* ── Loading ──────────────────────────────────────────── */}
          {step === "loading" && (
            <View className="mt-20 items-center">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-4 text-muted-foreground">
                Status wird geladen...
              </Text>
            </View>
          )}

          {/* ── 2FA is enabled ───────────────────────────────────── */}
          {step === "enabled" && (
            <View className="mt-6 mx-4">
              <View className="rounded-xl bg-card overflow-hidden">
                <View className="p-6 items-center">
                  <View className="w-16 h-16 rounded-full bg-green-500/15 items-center justify-center mb-4">
                    <Ionicons
                      name="shield-checkmark"
                      size={36}
                      color="#22c55e"
                    />
                  </View>
                  <Text className="text-xl font-semibold mb-2">
                    2FA ist aktiv
                  </Text>
                  <View className="rounded-full bg-green-500/15 px-3 py-1 mb-4">
                    <Text className="text-sm font-medium text-green-600">
                      Geschützt
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground text-center px-4">
                    Dein Konto ist durch Zwei-Faktor-Authentifizierung
                    geschützt. Bei jeder Anmeldung wird ein zusätzlicher Code
                    verlangt.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleDisable}
                disabled={loading}
                className="mt-4 rounded-xl bg-card overflow-hidden"
              >
                <View className="flex-row items-center px-4 py-3.5">
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#ef4444"
                    style={{ marginRight: 12 }}
                  />
                  <Text className="text-sm font-medium text-red-500 flex-1">
                    2FA deaktivieren
                  </Text>
                  {loading && (
                    <ActivityIndicator size="small" color="#ef4444" />
                  )}
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Step 1: Intro ────────────────────────────────────── */}
          {step === "intro" && (
            <View className="mt-6 mx-4">
              <View className="rounded-xl bg-card overflow-hidden">
                <View className="p-6 items-center">
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <Ionicons
                      name="shield-outline"
                      size={36}
                      color={colors.primary}
                    />
                  </View>
                  <Text className="text-xl font-semibold mb-2">
                    2FA aktivieren
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center px-4 leading-5">
                    Schütze dein Konto mit einer zusätzlichen
                    Sicherheitsebene. Du benötigst eine Authenticator-App wie
                    Google Authenticator, Authy oder 1Password.
                  </Text>
                </View>

                <View className="px-4 pb-4">
                  {/* Benefits */}
                  {[
                    "Schutz vor unbefugtem Zugriff",
                    "TOTP-basiert (zeitabhängiger Code)",
                    "Funktioniert auch offline",
                  ].map((text) => (
                    <View
                      key={text}
                      className="flex-row items-center py-2"
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#22c55e"
                        style={{ marginRight: 10 }}
                      />
                      <Text className="text-sm text-foreground">{text}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="mt-4">
                <Button
                  onPress={handleStartSetup}
                  disabled={loading}
                  className="rounded-xl"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Weiter
                    </Text>
                  )}
                </Button>
              </View>

              {error ? (
                <Text className="text-red-500 text-sm text-center mt-3">
                  {error}
                </Text>
              ) : null}
            </View>
          )}

          {/* ── Step 2: Setup — show secret ──────────────────────── */}
          {step === "setup" && (
            <View className="mt-6 mx-4">
              <View className="rounded-xl bg-card overflow-hidden">
                <View className="px-4 py-3 border-b border-border">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Schritt 1 von 2
                  </Text>
                </View>
                <View className="p-4">
                  <Text className="text-base font-semibold mb-2">
                    Authenticator-App einrichten
                  </Text>
                  <Text className="text-sm text-muted-foreground leading-5 mb-4">
                    Öffne deine Authenticator-App und füge einen neuen Account
                    hinzu. Kopiere den folgenden Code und füge ihn als
                    "Geheimschlüssel" ein.
                  </Text>

                  {/* Secret key display */}
                  <View
                    className="rounded-lg p-4 mb-3"
                    style={{ backgroundColor: `${colors.primary}08` }}
                  >
                    <Text className="text-xs text-muted-foreground mb-1">
                      Geheimschlüssel
                    </Text>
                    <Text
                      className="text-lg font-mono font-semibold tracking-widest"
                      selectable
                      style={{ color: colors.primary }}
                    >
                      {secret}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => copyToClipboard(secret)}
                    className="flex-row items-center justify-center rounded-lg bg-card border border-border py-2.5"
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className="text-sm font-medium"
                      style={{ color: colors.primary }}
                    >
                      Code kopieren
                    </Text>
                  </Pressable>

                  {/* TOTP URI for advanced users */}
                  {totpUri ? (
                    <View className="mt-4">
                      <Text className="text-xs text-muted-foreground mb-1">
                        Vollständige TOTP-URI (für fortgeschrittene Nutzer)
                      </Text>
                      <Pressable onPress={() => copyToClipboard(totpUri)}>
                        <Text
                          className="text-xs text-muted-foreground font-mono"
                          numberOfLines={2}
                          selectable
                        >
                          {totpUri}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>

              <View className="mt-4">
                <Button
                  onPress={() => {
                    setStep("verify");
                    setError("");
                  }}
                  className="rounded-xl"
                >
                  <Text className="text-white font-semibold text-base">
                    Weiter
                  </Text>
                </Button>
              </View>
            </View>
          )}

          {/* ── Step 3: Verify code ──────────────────────────────── */}
          {step === "verify" && (
            <View className="mt-6 mx-4">
              <View className="rounded-xl bg-card overflow-hidden">
                <View className="px-4 py-3 border-b border-border">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Schritt 2 von 2
                  </Text>
                </View>
                <View className="p-4">
                  <Text className="text-base font-semibold mb-2">
                    Code eingeben
                  </Text>
                  <Text className="text-sm text-muted-foreground leading-5 mb-4">
                    Gib den 6-stelligen Code aus deiner Authenticator-App ein,
                    um die Einrichtung abzuschliessen.
                  </Text>

                  <TextInput
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.replace(/[^0-9]/g, "").slice(0, 6));
                      setError("");
                    }}
                    placeholder="000000"
                    placeholderTextColor={colors.grey2}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    className="rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground"
                    style={{
                      letterSpacing: 12,
                      fontSize: 28,
                    }}
                  />

                  {error ? (
                    <Text className="text-red-500 text-sm text-center mt-3">
                      {error}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="mt-4 gap-3">
                <Button
                  onPress={handleVerify}
                  disabled={loading || code.length !== 6}
                  className="rounded-xl"
                  style={{
                    opacity: code.length !== 6 ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Bestätigen
                    </Text>
                  )}
                </Button>

                <Pressable
                  onPress={() => {
                    setStep("setup");
                    setCode("");
                    setError("");
                  }}
                >
                  <Text
                    className="text-sm text-center font-medium"
                    style={{ color: colors.primary }}
                  >
                    Zurück zum Geheimschlüssel
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Step 4: Done — show recovery codes ───────────────── */}
          {step === "done" && (
            <View className="mt-6 mx-4">
              <View className="rounded-xl bg-card overflow-hidden">
                <View className="p-6 items-center">
                  <View className="w-16 h-16 rounded-full bg-green-500/15 items-center justify-center mb-4">
                    <Ionicons
                      name="checkmark-circle"
                      size={36}
                      color="#22c55e"
                    />
                  </View>
                  <Text className="text-xl font-semibold mb-2">
                    2FA aktiviert!
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center">
                    Dein Konto ist jetzt zusätzlich geschützt.
                  </Text>
                </View>
              </View>

              {recoveryCodes.length > 0 && (
                <View className="mt-4 rounded-xl bg-card overflow-hidden">
                  <View className="px-4 py-3 border-b border-border">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Wiederherstellungs-Codes
                    </Text>
                  </View>
                  <View className="p-4">
                    <Text className="text-sm text-muted-foreground leading-5 mb-3">
                      Bewahre diese Codes sicher auf. Du kannst sie
                      verwenden, falls du den Zugang zu deiner
                      Authenticator-App verlierst.
                    </Text>

                    <View
                      className="rounded-lg p-3 mb-3"
                      style={{ backgroundColor: `${colors.primary}08` }}
                    >
                      {recoveryCodes.map((rc, i) => (
                        <Text
                          key={i}
                          className="text-sm font-mono py-0.5"
                          selectable
                        >
                          {rc}
                        </Text>
                      ))}
                    </View>

                    <Pressable
                      onPress={() =>
                        copyToClipboard(recoveryCodes.join("\n"))
                      }
                      className="flex-row items-center justify-center rounded-lg bg-card border border-border py-2.5"
                    >
                      <Ionicons
                        name="copy-outline"
                        size={18}
                        color={colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        className="text-sm font-medium"
                        style={{ color: colors.primary }}
                      >
                        Alle Codes kopieren
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Warning */}
              <View
                className="mt-4 rounded-xl p-4"
                style={{ backgroundColor: "#fef3c710" }}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons
                    name="warning"
                    size={18}
                    color="#f59e0b"
                  />
                  <Text className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
                    Wichtig
                  </Text>
                </View>
                <Text className="text-sm text-muted-foreground leading-5">
                  Speichere die Wiederherstellungs-Codes an einem sicheren Ort.
                  Sie werden nur einmal angezeigt und können nicht erneut
                  abgerufen werden.
                </Text>
              </View>

              <View className="mt-4">
                <Button
                  onPress={() => setStep("enabled")}
                  className="rounded-xl"
                >
                  <Text className="text-white font-semibold text-base">
                    Fertig
                  </Text>
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
