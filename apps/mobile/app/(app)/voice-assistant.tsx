/**
 * Sprachassistent — Voice Assistant Settings Screen
 *
 * Allows users to enable/disable Siri Shortcuts (iOS) or Google Assistant
 * App Actions (Android), view available voice commands, and try them out.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { useColorScheme } from "@/lib/useColorScheme";

import {
  SHORTCUTS,
  registerShortcuts,
  clearShortcuts,
  isShortcutsEnabled,
  handleShortcutDeepLink,
} from "@/lib/siri-shortcuts";

import {
  APP_ACTIONS,
  enableAssistant,
  disableAssistant,
  isAssistantEnabled,
} from "@/lib/google-assistant";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isIOS = Platform.OS === "ios";

interface VoiceCommand {
  id: string;
  title: string;
  phrase: string;
  description: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  deepLink: string;
}

function getCommands(): VoiceCommand[] {
  if (isIOS) {
    return SHORTCUTS.map((s) => ({
      id: s.id,
      title: s.title,
      phrase: `"Hey Siri, ${s.invocationPhrase}"`,
      description: s.description,
      iconName: mapSFToIonicon(s.iconName),
      color: "#007AFF",
      deepLink: s.deepLink,
    }));
  }

  return APP_ACTIONS.map((a) => ({
    id: a.id,
    title: a.title,
    phrase: `"Hey Google, ${a.queryPatterns[0]}"`,
    description: a.description,
    iconName: mapMaterialToIonicon(a.iconName),
    color: "#4285F4",
    deepLink: a.deepLink,
  }));
}

function mapSFToIonicon(
  sfName: string
): React.ComponentProps<typeof Ionicons>["name"] {
  const map: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    "plus.circle.fill": "add-circle",
    "minus.circle.fill": "remove-circle",
    "wrench.fill": "build",
    "magnifyingglass.circle.fill": "search-circle",
  };
  return map[sfName] ?? "ellipse";
}

function mapMaterialToIonicon(
  materialName: string
): React.ComponentProps<typeof Ionicons>["name"] {
  const map: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    "add-circle": "add-circle",
    "remove-circle": "remove-circle",
    build: "build",
    search: "search-circle",
  };
  return map[materialName] ?? "ellipse";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceAssistantScreen() {
  const { colors, isDarkColorScheme } = useColorScheme();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const commands = getCommands();
  const assistantName = isIOS ? "Siri" : "Google Assistant";

  // Load saved preference
  useEffect(() => {
    const load = async () => {
      const val = isIOS
        ? await isShortcutsEnabled()
        : await isAssistantEnabled();
      setEnabled(val);
      setLoading(false);
    };
    void load();
  }, []);

  // Toggle handler
  const handleToggle = useCallback(
    async (value: boolean) => {
      setEnabled(value);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (value) {
        const success = isIOS
          ? await registerShortcuts()
          : await enableAssistant();
        if (!success) {
          setEnabled(false);
          Alert.alert(
            "Fehler",
            `${assistantName}-Integration konnte nicht aktiviert werden. Bitte versuche es erneut.`
          );
        }
      } else {
        if (isIOS) {
          await clearShortcuts();
        } else {
          await disableAssistant();
        }
      }
    },
    [assistantName]
  );

  // "Try it" button handler
  const handleTry = useCallback((command: VoiceCommand) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = isIOS
      ? handleShortcutDeepLink(command.deepLink)
      : null;

    if (result) {
      router.push(result.screen as any);
    } else {
      // Fallback: navigate to scanner
      router.push("/(app)/scanner" as any);
    }
  }, []);

  const cardBg = isDarkColorScheme ? "#1c1c1e" : "#ffffff";
  const sectionBg = isDarkColorScheme ? "#2c2c2e" : "#f2f2f7";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Sprachassistent",
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView
        edges={["bottom"]}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header info */}
          <View
            style={{
              backgroundColor: isIOS ? "#007AFF15" : "#4285F415",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isIOS ? "#007AFF" : "#4285F4",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name={isIOS ? "mic" : "mic-outline"}
                size={32}
                color="#ffffff"
              />
            </View>
            <Text
              variant="title3"
              style={{
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 4,
              }}
            >
              {assistantName}-Integration
            </Text>
            <Text
              variant="footnote"
              style={{
                color: colors.grey,
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              {isIOS
                ? "Steuere LogistikApp mit Siri-Sprachbefehlen. Sage z.B. \"Hey Siri, Material einbuchen\"."
                : "Steuere LogistikApp mit Google Assistant. Sage z.B. \"Hey Google, Material einbuchen\"."}
            </Text>
          </View>

          {/* Enable/Disable toggle */}
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text variant="body" style={{ fontWeight: "600", marginBottom: 2 }}>
                {assistantName} Shortcuts aktivieren
              </Text>
              <Text variant="caption2" style={{ color: colors.grey }}>
                {enabled
                  ? "Sprachbefehle sind aktiv"
                  : "Sprachbefehle sind deaktiviert"}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={loading}
              trackColor={{ true: isIOS ? "#007AFF" : "#4285F4" }}
            />
          </View>

          {/* Available Commands */}
          <Text
            variant="footnote"
            style={{
              color: colors.grey,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Verfügbare Befehle
          </Text>

          {commands.map((cmd) => (
            <View
              key={cmd.id}
              style={{
                backgroundColor: cardBg,
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: cmd.color + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons name={cmd.iconName} size={20} color={cmd.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    variant="body"
                    style={{ fontWeight: "600", marginBottom: 1 }}
                  >
                    {cmd.title}
                  </Text>
                  <Text
                    variant="caption2"
                    style={{
                      color: cmd.color,
                      fontStyle: "italic",
                      fontWeight: "500",
                    }}
                  >
                    {cmd.phrase}
                  </Text>
                </View>
              </View>

              <Text
                variant="footnote"
                style={{
                  color: colors.grey,
                  marginBottom: 10,
                  lineHeight: 18,
                }}
              >
                {cmd.description}
              </Text>

              <Button
                variant="tonal"
                onPress={() => handleTry(cmd)}
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name="play-circle"
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    variant="caption1"
                    style={{ color: colors.primary, fontWeight: "600" }}
                  >
                    Probieren
                  </Text>
                </View>
              </Button>
            </View>
          ))}

          {/* Setup Instructions */}
          <Text
            variant="footnote"
            style={{
              color: colors.grey,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginTop: 14,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Einrichtung
          </Text>

          <View
            style={{
              backgroundColor: sectionBg,
              borderRadius: 12,
              padding: 16,
            }}
          >
            {isIOS ? (
              <>
                <InstructionStep
                  number={1}
                  text='Aktiviere den Schalter oben, um Siri Shortcuts zu registrieren.'
                  colors={colors}
                />
                <InstructionStep
                  number={2}
                  text='Öffne die "Kurzbefehle"-App auf deinem iPhone.'
                  colors={colors}
                />
                <InstructionStep
                  number={3}
                  text='Unter "Vorschläge" findest du die LogistikApp-Befehle.'
                  colors={colors}
                />
                <InstructionStep
                  number={4}
                  text='Tippe auf einen Befehl und passe den Auslöser an (z.B. "Hey Siri, Material einbuchen").'
                  colors={colors}
                  isLast
                />
                <Button
                  variant="plain"
                  onPress={() =>
                    Linking.openURL("shortcuts://")
                  }
                  style={{ marginTop: 12, alignSelf: "flex-start" }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      variant="caption1"
                      style={{ color: colors.primary, fontWeight: "600" }}
                    >
                      Kurzbefehle-App öffnen
                    </Text>
                  </View>
                </Button>
              </>
            ) : (
              <>
                <InstructionStep
                  number={1}
                  text='Aktiviere den Schalter oben.'
                  colors={colors}
                />
                <InstructionStep
                  number={2}
                  text='Sage "Hey Google, öffne LogistikApp" um zu starten.'
                  colors={colors}
                />
                <InstructionStep
                  number={3}
                  text='App Actions werden automatisch in Google Assistant registriert.'
                  colors={colors}
                />
                <InstructionStep
                  number={4}
                  text='Sage z.B. "Hey Google, Material einbuchen in LogistikApp".'
                  colors={colors}
                  isLast
                />
                <Button
                  variant="plain"
                  onPress={() =>
                    Linking.openURL(
                      "https://assistant.google.com/services/a/uid/logistikapp"
                    )
                  }
                  style={{ marginTop: 12, alignSelf: "flex-start" }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      variant="caption1"
                      style={{ color: colors.primary, fontWeight: "600" }}
                    >
                      Google Assistant öffnen
                    </Text>
                  </View>
                </Button>
              </>
            )}
          </View>

          {/* Privacy note */}
          <Text
            variant="caption2"
            style={{
              color: colors.grey,
              textAlign: "center",
              marginTop: 20,
              paddingHorizontal: 16,
              lineHeight: 16,
            }}
          >
            Sprachbefehle werden von {isIOS ? "Apple" : "Google"} verarbeitet.
            LogistikApp empfängt nur die erkannte Aktion, nicht die
            Audioaufnahme.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ---------------------------------------------------------------------------
// InstructionStep
// ---------------------------------------------------------------------------

function InstructionStep({
  number,
  text,
  colors,
  isLast = false,
}: {
  number: number;
  text: string;
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: isLast ? 0 : 12,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
          marginTop: 1,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: "700",
            lineHeight: 14,
          }}
        >
          {number}
        </Text>
      </View>
      <Text
        variant="footnote"
        style={{ flex: 1, lineHeight: 18, color: colors.grey }}
      >
        {text}
      </Text>
    </View>
  );
}
