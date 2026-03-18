/**
 * Voice Button — floating microphone button for hands-free control.
 *
 * Behaviour:
 *   - Press to start recording / recognition (hold is not required; it's a
 *     tap-to-start / tap-to-stop or auto-stop on silence model).
 *   - Shows a pulsing recording indicator while listening.
 *   - Displays recognised text in a floating pill.
 *   - If the command is parsed successfully, shows a confirmation sheet.
 *   - Uses expo-speech for TTS feedback (no native module required).
 *   - In demo mode, cycles through DEMO_VOICE_PRESETS instead of real
 *     speech recognition.
 *   - Haptic feedback at every state transition.
 *
 * Speech Recognition Strategy:
 *   React Native does not ship a first-party speech-to-text API.  This
 *   component uses the `@react-native-voice/voice` package when available.
 *   As that package requires a native build, we also support a graceful
 *   fallback: if `Voice` is unavailable (e.g. Expo Go), only demo mode works.
 *
 *   For production builds add `@react-native-voice/voice` to package.json and
 *   follow its setup guide.  The component detects availability at runtime via
 *   a try/catch import guard.
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "burnt";

import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Button } from "@/components/nativewindui/Button";
import {
  parseVoiceCommand,
  actionLabel,
  ttsConfirmation,
  DEMO_VOICE_PRESETS,
  type VoiceCommand,
} from "@/lib/voice-commands";
import { scanBarcode, createStockChange, createToolBooking } from "@/lib/api";
import { isDemoMode } from "@/lib/demo/config";
import type { ScanResult } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type ListeningState = "idle" | "listening" | "processing" | "confirming" | "executing";

interface VoiceButtonProps {
  /** Optional style overrides for the outer container. */
  style?: object;
}

// ── Demo voice preset index (cycles through presets each press) ───────────────

let _demoPresetIndex = 0;

function nextDemoText(): string {
  const preset = DEMO_VOICE_PRESETS[_demoPresetIndex % DEMO_VOICE_PRESETS.length];
  _demoPresetIndex++;
  return preset.text;
}

// ── TTS helper ────────────────────────────────────────────────────────────────

function speak(text: string) {
  Speech.speak(text, {
    language: "de-DE",
    pitch: 1.0,
    rate: Platform.OS === "ios" ? 0.5 : 1.0,
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export function VoiceButton({ style }: VoiceButtonProps) {
  const [state, setState] = useState<ListeningState>("idle");
  const [recognisedText, setRecognisedText] = useState<string>("");
  const [parsedCommand, setParsedCommand] = useState<VoiceCommand | null>(null);
  const [matches, setMatches] = useState<ScanResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<ScanResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Pulse animation while listening
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  // Voice recognition handle (lazy import)
  const VoiceRef = useRef<any>(null);

  // ── Pulse animation ─────────────────────────────────────────────────────────

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }

  // ── Lifecycle: set up Voice listeners ──────────────────────────────────────

  useEffect(() => {
    if (isDemoMode) return;

    let Voice: any = null;
    try {
      // Dynamic import to avoid crashing when module is not installed
      Voice = require("@react-native-voice/voice").default;
      VoiceRef.current = Voice;

      Voice.onSpeechResults = (e: any) => {
        const text: string = e.value?.[0] ?? "";
        if (text) {
          handleRecognisedText(text);
        }
      };

      Voice.onSpeechError = (_e: any) => {
        stopListening();
        setRecognisedText("Nicht verstanden");
        setState("idle");
        stopPulse();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      };
    } catch {
      // @react-native-voice/voice not installed — demo mode only
    }

    return () => {
      Voice?.destroy().catch(() => {});
    };
  }, []);

  // ── Core helpers ────────────────────────────────────────────────────────────

  function stopListening() {
    VoiceRef.current?.stop().catch(() => {});
    stopPulse();
  }

  async function handleRecognisedText(text: string) {
    setRecognisedText(text);
    stopPulse();
    setState("processing");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const cmd = parseVoiceCommand(text);
    if (!cmd) {
      setState("idle");
      setShowModal(false);
      toast({
        title: "Nicht erkannt",
        message: `"${text}" konnte nicht verarbeitet werden.`,
        preset: "error",
      });
      return;
    }

    setParsedCommand(cmd);

    // If action is lookup or needs item resolution, search first
    if (cmd.materialName) {
      try {
        // Use the scan-by-name endpoint — we pass the name as a barcode search
        // (the API /api/scan supports a ?name= query for text search)
        const result = await scanBarcode(`name:${cmd.materialName}`);
        if (result.type !== null && result.item) {
          setSelectedMatch(result);
          setMatches([result]);
        } else {
          setMatches([]);
          setSelectedMatch(null);
        }
      } catch {
        setMatches([]);
        setSelectedMatch(null);
      }
    }

    setState("confirming");
    setShowModal(true);
  }

  // ── Press handler ───────────────────────────────────────────────────────────

  async function handlePress() {
    if (state !== "idle") {
      // Cancel current operation
      stopListening();
      setState("idle");
      setShowModal(false);
      setRecognisedText("");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isDemoMode) {
      // Simulate recognition with a preset
      setState("listening");
      startPulse();
      setShowModal(true);
      setRecognisedText("...");

      await new Promise((r) => setTimeout(r, 1200));
      const demoText = nextDemoText();
      await handleRecognisedText(demoText);
      return;
    }

    if (!VoiceRef.current) {
      Alert.alert(
        "Spracherkennung nicht verfügbar",
        "Bitte installiere @react-native-voice/voice und erstelle einen nativen Build.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setState("listening");
      startPulse();
      setShowModal(true);
      setRecognisedText("Höre zu…");
      await VoiceRef.current.start("de-DE");
    } catch (err) {
      setState("idle");
      stopPulse();
      setShowModal(false);
      toast({ title: "Mikrofon-Fehler", preset: "error" });
    }
  }

  // ── Execute confirmed command ───────────────────────────────────────────────

  async function handleConfirm() {
    if (!parsedCommand) return;

    const match = selectedMatch;
    const item = match?.item as Record<string, unknown> | null;

    setState("executing");

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      switch (parsedCommand.action) {
        case "stock_in": {
          if (!item?.id || !item?.mainLocationId) {
            throw new Error("Material oder Lagerort nicht gefunden");
          }
          await createStockChange({
            materialId: item.id as string,
            locationId: item.mainLocationId as string,
            changeType: "in",
            quantity: parsedCommand.quantity ?? 1,
          });
          break;
        }
        case "stock_out": {
          if (!item?.id || !item?.mainLocationId) {
            throw new Error("Material oder Lagerort nicht gefunden");
          }
          await createStockChange({
            materialId: item.id as string,
            locationId: item.mainLocationId as string,
            changeType: "out",
            quantity: parsedCommand.quantity ?? 1,
          });
          break;
        }
        case "checkout": {
          if (!item?.id) throw new Error("Werkzeug nicht gefunden");
          await createToolBooking(item.id as string, { bookingType: "checkout" });
          break;
        }
        case "checkin": {
          if (!item?.id) throw new Error("Werkzeug nicht gefunden");
          await createToolBooking(item.id as string, { bookingType: "checkin" });
          break;
        }
        case "lookup":
          // Nothing to execute — result was already shown
          break;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const ttsText = ttsConfirmation(parsedCommand);
      speak(ttsText);
      toast({ title: ttsText, preset: "done" });
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({
        title: "Fehler",
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
        preset: "error",
      });
    } finally {
      resetState();
    }
  }

  function resetState() {
    setState("idle");
    setShowModal(false);
    setRecognisedText("");
    setParsedCommand(null);
    setMatches([]);
    setSelectedMatch(null);
  }

  // ── Button icon / colour by state ───────────────────────────────────────────

  const isActive = state !== "idle";
  const btnBg = isActive ? "#ef4444" : "#f97316";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating mic button */}
      <View style={[styles.container, style]} pointerEvents="box-none">
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: btnBg }]}
            onPress={handlePress}
            activeOpacity={0.8}
            accessibilityLabel={isActive ? "Sprachbefehl abbrechen" : "Sprachbefehl starten"}
            accessibilityRole="button"
          >
            {state === "processing" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={isActive ? "stop" : "mic"}
                size={24}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={resetState}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Listening state */}
            {state === "listening" && (
              <View style={styles.listeningContainer}>
                <Animated.View
                  style={[
                    styles.micRipple,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.micIcon}>
                  <Ionicons name="mic" size={32} color="#f97316" />
                </View>
                <Text style={styles.listeningLabel}>Höre zu…</Text>
                <Text style={styles.listeningHint}>
                  Deutsch sprechen, z.B. "Buche 10 Kabel ein"
                </Text>
                <TouchableOpacity onPress={resetState} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Abbrechen</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Processing state */}
            {state === "processing" && (
              <View style={styles.processingContainer}>
                <ActivityIndicator />
                <Text style={styles.processingText}>Verarbeite…</Text>
                {recognisedText ? (
                  <View style={styles.recognisedPill}>
                    <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                    <Text style={styles.recognisedText}>"{recognisedText}"</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Confirming state */}
            {(state === "confirming" || state === "executing") && parsedCommand && (
              <View style={styles.confirmContainer}>
                <View style={styles.recognisedPill}>
                  <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                  <Text style={styles.recognisedText}>"{recognisedText}"</Text>
                </View>

                {/* Parsed command summary */}
                <View style={styles.commandCard}>
                  <View style={styles.commandRow}>
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>
                        {actionLabel(parsedCommand.action)}
                      </Text>
                    </View>
                  </View>

                  {parsedCommand.materialName && (
                    <View style={styles.commandDetail}>
                      <Ionicons name="cube-outline" size={15} color="#6b7280" />
                      <Text style={styles.commandDetailText}>
                        {parsedCommand.materialName}
                      </Text>
                    </View>
                  )}
                  {parsedCommand.quantity && (
                    <View style={styles.commandDetail}>
                      <Ionicons name="layers-outline" size={15} color="#6b7280" />
                      <Text style={styles.commandDetailText}>
                        Menge: {parsedCommand.quantity}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Match result — found / not found */}
                {selectedMatch && selectedMatch.item ? (
                  <View style={styles.matchCard}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.matchText} numberOfLines={1}>
                      {selectedMatch.item.name as string}
                    </Text>
                  </View>
                ) : parsedCommand.action !== "lookup" ? (
                  <View style={styles.noMatchCard}>
                    <Ionicons name="warning-outline" size={16} color="#f97316" />
                    <Text style={styles.noMatchText}>
                      Kein passender Eintrag gefunden
                    </Text>
                  </View>
                ) : null}

                {/* Ambiguous: multiple matches (future) */}
                {matches.length > 1 && (
                  <ScrollView style={styles.matchList}>
                    {matches.map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.matchListRow,
                          selectedMatch === m && styles.matchListRowSelected,
                        ]}
                        onPress={() => setSelectedMatch(m)}
                      >
                        <Text style={styles.matchListText} numberOfLines={1}>
                          {m.item?.name as string}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Action buttons */}
                {state === "executing" ? (
                  <View style={styles.executingRow}>
                    <ActivityIndicator size="small" />
                    <Text style={styles.executingText}>Wird ausgeführt…</Text>
                  </View>
                ) : (
                  <View style={styles.confirmButtons}>
                    <Button
                      onPress={handleConfirm}
                      style={styles.confirmBtn}
                      disabled={
                        parsedCommand.action !== "lookup" && !selectedMatch?.item
                      }
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.confirmBtnText}>Ausführen</Text>
                    </Button>
                    <Button variant="tonal" onPress={resetState} style={styles.cancelActionBtn}>
                      <Text>Abbrechen</Text>
                    </Button>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 16,
  },
  // Listening
  listeningContainer: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  micRipple: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  micIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f97316",
  },
  listeningLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  listeningHint: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  // Processing
  processingContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  processingText: {
    fontSize: 15,
    color: "#6b7280",
  },
  // Confirming
  confirmContainer: {
    gap: 12,
  },
  recognisedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  recognisedText: {
    color: "#374151",
    fontSize: 13,
    fontStyle: "italic",
  },
  commandCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  commandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBadge: {
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  commandDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  commandDetailText: {
    fontSize: 14,
    color: "#374151",
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  matchText: {
    color: "#15803d",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  noMatchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  noMatchText: {
    color: "#c2410c",
    fontSize: 14,
  },
  matchList: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
  },
  matchListRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  matchListRowSelected: {
    backgroundColor: "#fff7ed",
  },
  matchListText: {
    fontSize: 14,
    color: "#374151",
  },
  confirmButtons: {
    gap: 8,
    marginTop: 4,
  },
  confirmBtn: {
    flexDirection: "row",
    gap: 6,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelActionBtn: {},
  executingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  executingText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
