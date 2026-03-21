/**
 * Full-screen NFC mode — used internally by scanner.tsx via SegmentedControl.
 * Not a standalone tab; rendered inline when the user picks "NFC" in the
 * scanner toggle.
 */
import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/nativewindui/Text";
import { Button } from "@/components/nativewindui/Button";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Icon } from "@/components/nativewindui/Icon";
import { initNfc, readNfcTag, cancelNfcScan } from "@/lib/nfc";
import { isDemoMode } from "@/lib/demo/config";

interface NfcScanViewProps {
  /** Called when a tag is successfully read — passes the raw string value. */
  onRead: (value: string) => void;
  /** Whether the view is actively looking for a tag. */
  isActive: boolean;
  /** Callback so parent can flip back to camera mode. */
  onCancel?: () => void;
}

/**
 * Inline component that shows the pulsing NFC icon and drives the scan loop.
 * Parent (scanner.tsx) mounts this when the NFC segment is selected.
 */
export function NfcScanView({ onRead, isActive, onCancel }: NfcScanViewProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const isScanning = useRef(false);

  // Pulse animation
  useEffect(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
    return () => {
      pulseLoop.current?.stop();
    };
  }, [pulseAnim]);

  const startScan = useCallback(async () => {
    if (isScanning.current) return;
    isScanning.current = true;

    if (isDemoMode) {
      // Simulate a read after 2 s in demo mode
      await new Promise((r) => setTimeout(r, 2000));
      isScanning.current = false;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRead("7612345678901"); // demo barcode
      return;
    }

    const supported = await initNfc();
    if (!supported) {
      isScanning.current = false;
      return;
    }

    const value = await readNfcTag();
    isScanning.current = false;

    if (value) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Strip self-service URL prefix if present
      const code = extractCode(value);
      onRead(code);
    }
  }, [onRead]);

  // Kick off a scan whenever the view becomes active
  useEffect(() => {
    if (!isActive) {
      cancelNfcScan();
      isScanning.current = false;
      return;
    }
    startScan();
    return () => {
      cancelNfcScan();
      isScanning.current = false;
    };
  }, [isActive, startScan]);

  return (
    <View style={styles.container}>
      {/* Pulsing NFC icon */}
      <View style={styles.iconWrapper}>
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.25],
                outputRange: [0.35, 0],
              }),
            },
          ]}
        />
        <View style={styles.iconCircle}>
          <Icon
            name={Platform.OS === "ios" ? "wave.3.right" : ("nfc" as any)}
            size={52}
            color="#fff"
            materialCommunityIcon={
              Platform.OS === "android"
                ? { name: "nfc", color: "#fff" }
                : undefined
            }
          />
        </View>
      </View>

      <Text variant="title2" className="text-white font-semibold text-center mt-8">
        NFC-Tag scannen
      </Text>
      <Text className="text-white/60 text-center text-sm mt-2 px-8">
        Halte dein Gerät an den NFC-Tag
      </Text>

      <View className="mt-6 items-center">
        <ActivityIndicator color="rgba(255,255,255,0.6)" />
      </View>

      {onCancel && (
        <View style={styles.cancelButton}>
          <Button variant="plain" onPress={onCancel}>
            <Text className="text-white/60 text-sm">Abbrechen</Text>
          </Button>
        </View>
      )}
    </View>
  );
}

/** Extract bare barcode / code from a self-service URL like https://app.logistikapp.ch/s/{code} */
function extractCode(value: string): string {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "s" && parts[1]) return parts[1];
  } catch {
    // Not a URL — return as-is
  }
  return value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  iconWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#f97316",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  cancelButton: {
    position: "absolute",
    bottom: 60,
  },
});

// Default export for Expo Router (hidden tab screen)
export default function NfcScreen() {
  return <NfcScanView onRead={() => {}} isActive={false} onCancel={() => {}} />
}
