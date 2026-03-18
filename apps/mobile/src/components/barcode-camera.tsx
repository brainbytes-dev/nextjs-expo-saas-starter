import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Linking, AppState, type AppStateStatus } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Button } from "@/components/nativewindui/Button";
import { Text } from "@/components/nativewindui/Text";

interface BarcodeCameraProps {
  onScanned: (barcode: string) => void;
  isActive?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;

export function BarcodeCamera({ onScanned, isActive = true }: BarcodeCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<{ barcode: string; time: number } | null>(null);
  const appState = useRef(AppState.currentState);

  // Reset debounce when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        lastScanRef.current = null;
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (!isActive) return;

    const now = Date.now();
    const last = lastScanRef.current;

    // Debounce: ignore same barcode within cooldown OR any barcode within half cooldown
    if (last && now - last.time < SCAN_COOLDOWN_MS) return;

    lastScanRef.current = { barcode: data, time: now };
    onScanned(data);
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text className="text-muted-foreground text-sm">Kamerazugriff wird geprüft…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered} className="gap-4 px-8">
        <Text variant="heading" className="text-center">Kamerazugriff erforderlich</Text>
        <Text className="text-muted-foreground text-center text-sm">
          LogistikApp benötigt Zugriff auf die Kamera um Barcodes zu scannen.
        </Text>
        {permission.canAskAgain ? (
          <Button onPress={requestPermission}>
            <Text>Zugriff erlauben</Text>
          </Button>
        ) : (
          <Button onPress={() => Linking.openSettings()}>
            <Text>Einstellungen öffnen</Text>
          </Button>
        )}
      </View>
    );
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{
        barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "datamatrix"],
      }}
      onBarcodeScanned={isActive ? handleBarcodeScanned : undefined}
    >
      {/* Scan overlay */}
      <View style={styles.overlay}>
        <View style={styles.topFade} />
        <View style={styles.middleRow}>
          <View style={styles.sideFade} />
          <View style={styles.scanWindow}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideFade} />
        </View>
        <View style={styles.bottomFade}>
          <Text className="text-white text-center text-sm opacity-80 mt-4">
            Barcode im Rahmen positionieren
          </Text>
        </View>
      </View>
    </CameraView>
  );
}

const WINDOW_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;
const CORNER_COLOR = "#f97316";

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
  },
  topFade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  middleRow: {
    flexDirection: "row",
    height: WINDOW_SIZE,
  },
  sideFade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  scanWindow: {
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    position: "relative",
  },
  bottomFade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingTop: 12,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
});
