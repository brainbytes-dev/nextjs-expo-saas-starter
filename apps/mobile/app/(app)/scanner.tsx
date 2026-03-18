import { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Text } from "@/components/nativewindui/Text";
import { BarcodeCamera } from "@/components/barcode-camera";
import { ScanResultSheet } from "@/components/scan-result-sheet";
import { CommissionPicker, type CommissionPickerItem } from "@/components/commission-picker";
import { scanBarcode, eanLookup, type ScanResult } from "@/lib/api";
import { CreateMaterialSheet } from "@/components/create-material-sheet";
import { NfcScanView } from "./nfc";
import { useColorScheme } from "@/lib/useColorScheme";

type ScanMode = "camera" | "nfc";

export default function ScannerScreen() {
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [pickCommissionFor, setPickCommissionFor] =
    useState<CommissionPickerItem | null>(null);
  const [createBarcode, setCreateBarcode] = useState<string | null>(null);
  const [eanData, setEanData] = useState<any>(null);
  const [eanLoading, setEanLoading] = useState(false);
  const lastScannedBarcode = useRef<string>("");
  const { colors } = useColorScheme();

  const handleScanned = useCallback(
    async (barcode: string) => {
      if (isLooking || scanResult !== null) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsLooking(true);
      lastScannedBarcode.current = barcode;

      try {
        const result = await scanBarcode(barcode);
        setScanResult(result);
      } catch {
        setScanResult({ type: null, item: null });
      } finally {
        setIsLooking(false);
      }
    },
    [isLooking, scanResult]
  );

  function handleDismiss() {
    setScanResult(null);
  }

  function handleAddToCommission(
    itemType: "material" | "tool",
    itemId: string,
    quantity: number
  ) {
    setScanResult(null);
    setPickCommissionFor({ type: itemType, id: itemId, quantity });
  }

  function handleCommissionPickerDismiss() {
    setPickCommissionFor(null);
  }

  async function handleCreateMaterial(barcode: string) {
    setScanResult(null);
    setEanLoading(true);
    try {
      const result = await eanLookup(barcode);
      setEanData(result.found ? result : null);
    } catch {
      setEanData(null);
    }
    setEanLoading(false);
    setCreateBarcode(barcode);
  }

  function handleMaterialCreated() {
    setCreateBarcode(null);
    setEanData(null);
  }

  // The NFC scan view is "active" when NFC mode is selected and no sheet is open
  const nfcActive =
    scanMode === "nfc" &&
    !isLooking &&
    scanResult === null &&
    pickCommissionFor === null &&
    createBarcode === null;

  return (
    <View style={styles.container}>
      {/* Header — positioned absolutely so BarcodeCamera / NfcScanView fill behind */}
      <View style={styles.header}>
        <LargeTitleHeader title="Scanner" backgroundColor="transparent" />
      </View>

      {/* Mode toggle — sits just below the header */}
      <View style={styles.toggleWrapper}>
        <SegmentedControl
          values={["Kamera", "NFC"]}
          selectedIndex={scanMode === "camera" ? 0 : 1}
          onChange={(e) => {
            const idx = e.nativeEvent.selectedSegmentIndex;
            setScanMode(idx === 0 ? "camera" : "nfc");
          }}
          style={styles.segmented}
          tintColor={Platform.OS === "ios" ? colors.primary : undefined}
          backgroundColor={
            Platform.OS === "ios" ? "rgba(255,255,255,0.15)" : undefined
          }
          fontStyle={{ color: "#fff" }}
          activeFontStyle={{ color: "#fff" }}
        />
      </View>

      {/* Scan content */}
      {scanMode === "camera" ? (
        <BarcodeCamera
          onScanned={handleScanned}
          isActive={
            !isLooking &&
            scanResult === null &&
            pickCommissionFor === null &&
            createBarcode === null
          }
        />
      ) : (
        <NfcScanView
          onRead={handleScanned}
          isActive={nfcActive}
          onCancel={() => setScanMode("camera")}
        />
      )}

      {/* Loading indicator during lookup */}
      {isLooking && (
        <View style={styles.lookingOverlay}>
          <View className="bg-black/70 rounded-2xl px-6 py-4 items-center gap-2">
            <ActivityIndicator color="white" />
            <Text className="text-white text-sm">Suche…</Text>
          </View>
        </View>
      )}

      <ScanResultSheet
        result={scanResult}
        scannedBarcode={lastScannedBarcode.current}
        onDismiss={handleDismiss}
        onAddToCommission={handleAddToCommission}
        onCreateMaterial={handleCreateMaterial}
      />

      <CommissionPicker
        item={pickCommissionFor}
        onDismiss={handleCommissionPickerDismiss}
      />

      {/* EAN lookup loading overlay */}
      {eanLoading && (
        <View style={styles.lookingOverlay}>
          <View className="bg-black/70 rounded-2xl px-6 py-4 items-center gap-2">
            <ActivityIndicator color="white" />
            <Text className="text-white text-sm">EAN wird gesucht…</Text>
          </View>
        </View>
      )}

      <CreateMaterialSheet
        key={createBarcode ?? "closed"}
        visible={createBarcode !== null}
        barcode={createBarcode ?? ""}
        eanData={eanData}
        onCreated={handleMaterialCreated}
        onDismiss={() => {
          setCreateBarcode(null);
          setEanData(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  toggleWrapper: {
    position: "absolute",
    top: 110,
    left: 24,
    right: 24,
    zIndex: 15,
  },
  segmented: {
    height: 36,
  },
  lookingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
