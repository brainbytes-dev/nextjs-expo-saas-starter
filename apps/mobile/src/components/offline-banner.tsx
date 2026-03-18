import { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/nativewindui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useIsOnline } from "@/lib/connectivity";
import { useQueue } from "@/lib/offline-queue";
import { useConflicts } from "@/lib/conflict-resolver";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConflictModal } from "./conflict-modal";

export function OfflineBanner() {
  const online = useIsOnline();
  const { pendingCount } = useQueue();
  const { conflicts, unresolvedCount } = useConflicts();
  const insets = useSafeAreaInsets();
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  const hasConflicts = unresolvedCount > 0;
  const showBanner = !online || pendingCount > 0 || hasConflicts;

  if (!showBanner) return null;

  // Conflict banner takes precedence over the offline/syncing banner
  if (hasConflicts) {
    return (
      <>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setConflictModalVisible(true)}
          style={{
            position: "absolute",
            top: insets.top,
            left: 0,
            right: 0,
            zIndex: 999,
            backgroundColor: "#ef4444",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 7,
            gap: 6,
          }}
          accessibilityLabel={`${unresolvedCount} Konflikte — Tippen zum Lösen`}
          accessibilityRole="button"
        >
          <Ionicons name="warning-outline" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
            {unresolvedCount} {unresolvedCount === 1 ? "Konflikt" : "Konflikte"} —
            Tippen zum Lösen
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#fff" />
        </TouchableOpacity>

        <ConflictModal
          conflicts={conflicts.filter((c) => !c.resolution)}
          visible={conflictModalVisible}
          onClose={() => setConflictModalVisible(false)}
        />
      </>
    );
  }

  const message = !online
    ? "Offline — Änderungen werden gespeichert"
    : `Synchronisiere… (${pendingCount})`;
  const bgColor = !online ? "#F59E0B" : "#3B82F6";
  const icon = !online ? "cloud-offline" : "sync";

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 999,
        backgroundColor: bgColor,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        gap: 6,
      }}
      pointerEvents="none"
    >
      <Ionicons name={icon as any} size={14} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
        {message}
      </Text>
    </View>
  );
}
