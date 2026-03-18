import { router, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { toast } from "burnt";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { BarcodeCamera } from "@/components/barcode-camera";
import { scanBarcode, addCommissionEntry } from "@/lib/api";

export default function CommissionScanModal() {
  const params = useLocalSearchParams<{ commissionId: string }>();
  const commissionId = Array.isArray(params.commissionId) ? params.commissionId[0] : params.commissionId;
  const [isProcessing, setIsProcessing] = useState(false);

  if (!commissionId) {
    router.back();
    return null;
  }
  const [addedCount, setAddedCount] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const processingRef = useRef(false);

  const handleScanned = useCallback(
    async (barcode: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);

      try {
        const result = await scanBarcode(barcode);

        if (!result.type || !result.item?.id) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          toast({ title: "Nicht gefunden", message: `Barcode: ${barcode}`, preset: "error" });
          return;
        }

        if (result.type === "key") {
          toast({ title: "Nicht unterstützt", message: "Schlüssel können nicht hinzugefügt werden", preset: "error" });
          return;
        }

        const entryBody =
          result.type === "material"
            ? { materialId: result.item.id as string, quantity: 1 }
            : { toolId: result.item.id as string, quantity: 1 };

        await addCommissionEntry(commissionId, entryBody);

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAddedCount((n) => n + 1);
        setLastAdded(result.item.name as string);
        toast({ title: "Hinzugefügt", message: result.item.name as string, preset: "done" });
      } catch (err) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast({
          title: "Fehler",
          message: err instanceof Error ? err.message : "Unbekannter Fehler",
          preset: "error",
        });
      } finally {
        setIsProcessing(false);
        // Small delay before allowing next scan
        setTimeout(() => {
          processingRef.current = false;
        }, 1500);
      }
    },
    [commissionId]
  );

  return (
    <View style={styles.container}>
      <BarcodeCamera onScanned={handleScanned} isActive={!isProcessing} />

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View className="bg-black/70 rounded-2xl px-6 py-4 items-center gap-2">
            <ActivityIndicator color="white" />
            <Text className="text-white text-sm">Wird hinzugefügt…</Text>
          </View>
        </View>
      )}

      {/* Counter + last added */}
      <View style={styles.statusBar} className="bg-black/70 rounded-2xl px-5 py-3 gap-1">
        <View className="flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
          <Text className="text-white font-semibold">
            {addedCount} {addedCount === 1 ? "Artikel" : "Artikel hinzugefügt"}
          </Text>
        </View>
        {lastAdded ? (
          <Text className="text-white/70 text-xs" numberOfLines={1}>
            Zuletzt: {lastAdded}
          </Text>
        ) : null}
      </View>

      {/* Done button */}
      <View style={styles.doneButton}>
        <Button onPress={() => router.back()}>
          <Text className="text-white">Fertig</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  statusBar: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
  },
  doneButton: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
  },
});
