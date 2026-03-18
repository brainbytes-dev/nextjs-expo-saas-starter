import { useState, useCallback } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "burnt";

import { Button } from "@/components/nativewindui/Button";
import { Text } from "@/components/nativewindui/Text";
import { TextField } from "@/components/nativewindui/TextField";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { createMaterial } from "@/lib/api";
import { getSession } from "@/lib/session-store";
import { getOrgId } from "@/lib/org-store";
import { isDemoMode } from "@/lib/demo/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EanData {
  found: boolean;
  barcode?: string;
  name?: string;
  manufacturer?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  source?: string;
}

interface AiRecognizeResult {
  name: string;
  manufacturer: string;
  category: string;
  description: string;
  estimatedPrice: string;
  unit: string;
}

interface CreateMaterialSheetProps {
  visible: boolean;
  barcode: string;
  eanData: EanData | null;
  onCreated: (id: string, name: string) => void;
  onDismiss: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UNITS = ["Stk", "m", "kg", "l", "Paar", "Packung"] as const;

const BASE_URL = process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3003";

const DEMO_AI_RESULT: AiRecognizeResult = {
  name: "Hilti TE 70-ATC Bohrhammer",
  manufacturer: "Hilti",
  category: "Elektrowerkzeug",
  description: "Kombihammer für Beton und Mauerwerk",
  estimatedPrice: "2450.00",
  unit: "Stk",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function recognizeImageUri(uri: string): Promise<AiRecognizeResult | null> {
  if (isDemoMode) {
    // Simulate latency
    await new Promise((r) => setTimeout(r, 900));
    return DEMO_AI_RESULT;
  }

  const session = getSession();
  const orgId = getOrgId();

  const formData = new FormData();
  // React Native FormData accepts { uri, name, type } objects
  formData.append("image", {
    uri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const headers: Record<string, string> = {
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(orgId ? { "x-organization-id": orgId } : {}),
  };

  const res = await fetch(`${BASE_URL}/api/ai/recognize`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.result as AiRecognizeResult;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateMaterialSheet({
  visible,
  barcode,
  eanData,
  onCreated,
  onDismiss,
}: CreateMaterialSheetProps) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiRecognizeResult | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Form state — pre-fill from EAN data when available
  const [name, setName] = useState(() => eanData?.name ?? "");
  const [articleNumber, setArticleNumber] = useState(() => barcode);
  const [unit, setUnit] = useState<string>("Stk");
  const [manufacturer, setManufacturer] = useState(
    () => eanData?.manufacturer ?? ""
  );
  const [notes, setNotes] = useState("");

  const hasEan = !!eanData?.found;

  // ── Photo & AI ─────────────────────────────────────────────────────────────

  const pickAndRecognize = useCallback(async (source: "camera" | "gallery") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Kamera-Zugriff",
            "Bitte erlaube den Kamera-Zugriff in den Einstellungen."
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsEditing: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Galerie-Zugriff",
            "Bitte erlaube den Galerie-Zugriff in den Einstellungen."
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsEditing: false,
        });
      }

      if (result.canceled || !result.assets[0]?.uri) return;

      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setAiLoading(true);
      setAiResult(null);

      const recognized = await recognizeImageUri(uri);

      if (recognized) {
        setAiResult(recognized);
        // Auto-fill empty fields
        if (!name && recognized.name) setName(recognized.name);
        if (!manufacturer && recognized.manufacturer)
          setManufacturer(recognized.manufacturer);
        if (!notes && recognized.description) setNotes(recognized.description);
        if (recognized.unit && UNITS.includes(recognized.unit as typeof UNITS[number])) {
          setUnit(recognized.unit);
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast({ title: "KI-Erkennung erfolgreich", preset: "done" });
      } else {
        toast({
          title: "Erkennung fehlgeschlagen",
          message: "Bitte manuell ausfüllen.",
          preset: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Fehler",
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
        preset: "error",
      });
    } finally {
      setAiLoading(false);
    }
  }, [name, manufacturer, notes]);

  const showPhotoOptions = useCallback(() => {
    Alert.alert(
      "Foto aufnehmen",
      "Wie möchtest du ein Foto hinzufügen?",
      [
        { text: "Kamera", onPress: () => pickAndRecognize("camera") },
        { text: "Galerie", onPress: () => pickAndRecognize("gallery") },
        { text: "Abbrechen", style: "cancel" },
      ]
    );
  }, [pickAndRecognize]);

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleDismiss() {
    if (loading || aiLoading) return;
    onDismiss();
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({ title: "Name erforderlich", preset: "error" });
      return;
    }

    setLoading(true);
    try {
      const result = await createMaterial({
        name: trimmedName,
        number: articleNumber.trim() || undefined,
        unit: unit || undefined,
        barcode: barcode || undefined,
        manufacturer: manufacturer.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: "Material angelegt", preset: "done" });
      onCreated(result.id, result.name);
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet} className="bg-card">
        {/* Handle */}
        <View className="w-10 h-1 rounded-full bg-muted-foreground/30 self-center mb-4" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row with camera button */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
              <Ionicons name="add-circle-outline" size={22} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text variant="title2" className="font-bold">
                Neues Material anlegen
              </Text>
              {barcode ? (
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Barcode: {barcode}
                </Text>
              ) : null}
            </View>

            {/* Camera / AI button */}
            <TouchableOpacity
              onPress={showPhotoOptions}
              disabled={aiLoading || loading}
              className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center"
              accessibilityLabel="Foto für KI-Erkennung aufnehmen"
              accessibilityRole="button"
            >
              {aiLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Ionicons
                  name={photoUri ? "camera" : "camera-outline"}
                  size={20}
                  color="#f97316"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* AI result badge */}
          {aiResult && (
            <View className="flex-row items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 mb-4">
              <Ionicons name="sparkles" size={16} color="#7c3aed" />
              <Text className="text-sm text-violet-700 font-medium flex-1">
                KI erkannt: {aiResult.name}
              </Text>
              {aiResult.category ? (
                <Text className="text-xs text-violet-500">
                  {aiResult.category}
                </Text>
              ) : null}
            </View>
          )}

          {/* EAN badge */}
          {hasEan && !aiResult && (
            <View className="flex-row items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-4">
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text className="text-sm text-green-700 font-medium">
                EAN erkannt
                {eanData?.source ? ` · ${eanData.source}` : ""}
              </Text>
              {eanData?.category ? (
                <Text className="text-xs text-green-600 ml-auto">
                  {eanData.category}
                </Text>
              ) : null}
            </View>
          )}

          {/* Form fields */}
          <View className="gap-4">
            {/* Name */}
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name *
              </Text>
              <TextField
                label="Materialname"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            {/* Artikelnummer */}
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Artikelnummer
              </Text>
              <TextField
                label="Artikelnummer"
                value={articleNumber}
                onChangeText={setArticleNumber}
                autoCapitalize="characters"
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            {/* Einheit picker */}
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Einheit
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => !loading && setUnit(u)}
                    className={[
                      "px-4 py-2 rounded-xl border",
                      unit === u
                        ? "bg-orange-500 border-orange-500"
                        : "bg-muted/40 border-border",
                    ].join(" ")}
                    accessibilityRole="button"
                    accessibilityState={{ selected: unit === u }}
                  >
                    <Text
                      className={[
                        "text-sm font-medium",
                        unit === u ? "text-white" : "text-foreground",
                      ].join(" ")}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Hersteller */}
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Hersteller
              </Text>
              <TextField
                label="Hersteller"
                value={manufacturer}
                onChangeText={setManufacturer}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            {/* Notizen */}
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notizen (optional)
              </Text>
              <TextField
                label="Notizen"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                editable={!loading}
                className={Platform.OS === "ios" ? "min-h-[72px]" : undefined}
              />
            </View>
          </View>

          {/* Save button */}
          <View className="mt-6">
            {loading ? (
              <View className="items-center py-4">
                <ActivityIndicator />
              </View>
            ) : (
              <Button onPress={handleSave} disabled={aiLoading}>
                <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                <Text className="text-white ml-2 font-semibold">Speichern</Text>
              </Button>
            )}
          </View>

          {/* Dismiss link */}
          <TouchableOpacity
            onPress={handleDismiss}
            disabled={loading || aiLoading}
            className="mt-3 py-3 items-center"
          >
            <Text className="text-muted-foreground text-sm">Abbrechen</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
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
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
});
