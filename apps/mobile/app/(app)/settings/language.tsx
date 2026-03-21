import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Text } from "@/components/nativewindui/Text";
import { useColorScheme } from "@/lib/useColorScheme";

// ---------------------------------------------------------------------------
// Language options
// ---------------------------------------------------------------------------
const STORAGE_KEY = "app_language";

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "de", label: "Deutsch", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "fr", label: "Fran\u00E7ais", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "it", label: "Italiano", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
];

// ---------------------------------------------------------------------------
// Language Selection Screen
// ---------------------------------------------------------------------------
export default function LanguageScreen() {
  const { colors } = useColorScheme();
  const [selected, setSelected] = useState("de");
  const [loaded, setLoaded] = useState(false);

  // Load saved language
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setSelected(saved);
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const handleSelect = useCallback(
    async (code: string) => {
      if (code === selected) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelected(code);

      try {
        await AsyncStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore
      }

      Alert.alert(
        "Sprache gewechselt",
        "Die Spracheinstellung wurde gespeichert. Starte die App neu, um die Änderung vollständig zu übernehmen.",
        [{ text: "OK" }]
      );
    },
    [selected]
  );

  if (!loaded) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Sprache",
          headerStyle: { backgroundColor: colors.card },
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-12"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Header info */}
          <View className="mt-6 mx-4 mb-2">
            <Text className="text-sm text-muted-foreground leading-5">
              Wähle die Sprache für die App-Oberfläche. Die Änderung wird
              nach einem Neustart der App wirksam.
            </Text>
          </View>

          {/* Language list */}
          <View className="mt-4 mx-4 rounded-xl bg-card overflow-hidden">
            {LANGUAGES.map((lang, idx) => {
              const isSelected = lang.code === selected;
              const isLast = idx === LANGUAGES.length - 1;

              return (
                <View key={lang.code}>
                  <Pressable
                    onPress={() => handleSelect(lang.code)}
                    className="flex-row items-center px-4 py-3.5"
                    android_ripple={{ color: `${colors.primary}20` }}
                  >
                    {/* Flag */}
                    <Text className="text-2xl mr-3">{lang.flag}</Text>

                    {/* Label */}
                    <View className="flex-1">
                      <Text
                        className="text-base font-medium"
                        style={isSelected ? { color: colors.primary } : {}}
                      >
                        {lang.label}
                      </Text>
                    </View>

                    {/* Checkmark */}
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                  {!isLast && <View className="h-px bg-border ml-14" />}
                </View>
              );
            })}
          </View>

          {/* Info note */}
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
              Die Spracheinstellung betrifft nur die App-Oberfläche.
              Systemmeldungen und Push-Benachrichtigungen werden in der
              Gerätesprache angezeigt.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
