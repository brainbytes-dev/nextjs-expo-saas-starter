/**
 * BatchScanView — continuous scanning mode.
 *
 * Renders the camera full-screen. Each successful scan is appended to a
 * growing list anchored to the bottom of the screen. If the same barcode
 * appears again the quantity on the existing row is incremented instead of
 * creating a duplicate entry.
 *
 * The parent controls visibility via `isActive`. When the user taps one of
 * the action buttons the full list is passed to `onComplete`.
 */

import {
  useCallback,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BarcodeCamera } from "@/components/barcode-camera";
import { Text } from "@/components/nativewindui/Text";
import { scanBarcode, type ScanResult } from "@/lib/api";

// ── Public types ──────────────────────────────────────────────────────

export interface BatchItem {
  /** Internal unique key for this row */
  id: string;
  barcode: string;
  name: string;
  /** Resolved material or tool id from the API. Null when barcode is unknown. */
  materialId: string | null;
  toolId: string | null;
  /** Primary location id for stock changes, derived from the scan result. */
  locationId: string | null;
  itemType: ScanResult["type"];
  quantity: number;
  scannedAt: number;
}

export type BatchAction = "in" | "out" | "commission";

export interface BatchScanHandle {
  clear: () => void;
}

interface BatchScanViewProps {
  isActive: boolean;
  onComplete: (items: BatchItem[], action: BatchAction) => void;
}

// ── Component ─────────────────────────────────────────────────────────

export const BatchScanView = forwardRef<BatchScanHandle, BatchScanViewProps>(
  function BatchScanView({ isActive, onComplete }, ref) {
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<BatchItem[]>([]);
    // barcode → row id for duplicate detection
    const barcodeIndex = useRef<Map<string, string>>(new Map());
    const scanningRef = useRef(false);

    useImperativeHandle(ref, () => ({
      clear: () => {
        setItems([]);
        barcodeIndex.current.clear();
      },
    }));

    const handleScanned = useCallback(async (barcode: string) => {
      if (scanningRef.current) return;
      scanningRef.current = true;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Duplicate: bump quantity
      const existingId = barcodeIndex.current.get(barcode);
      if (existingId) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === existingId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
        setTimeout(() => {
          scanningRef.current = false;
        }, 800);
        return;
      }

      // New barcode: resolve it via API
      let result: ScanResult = { type: null, item: null };
      try {
        result = await scanBarcode(barcode);
      } catch {
        // Proceed with unresolved item
      }

      const rawItem = result.item;
      const name =
        result.type !== null && rawItem
          ? (rawItem.name as string | undefined) ?? barcode
          : barcode;

      const materialId =
        result.type === "material" && rawItem
          ? (rawItem.id as string | undefined) ?? null
          : null;

      const toolId =
        result.type === "tool" && rawItem
          ? (rawItem.id as string | undefined) ?? null
          : null;

      // Prefer mainLocationId, then locationId
      const locationId =
        rawItem
          ? (rawItem.mainLocationId as string | undefined) ??
            (rawItem.locationId as string | undefined) ??
            null
          : null;

      const newItem: BatchItem = {
        id: String(Date.now()),
        barcode,
        name,
        materialId,
        toolId,
        locationId,
        itemType: result.type,
        quantity: 1,
        scannedAt: Date.now(),
      };

      barcodeIndex.current.set(barcode, newItem.id);
      setItems((prev) => [...prev, newItem]);

      setTimeout(() => {
        scanningRef.current = false;
      }, 800);
    }, []);

    function handleQuantityChange(id: string, raw: string) {
      const qty = parseInt(raw, 10);
      if (!Number.isFinite(qty) || qty < 1) return;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
      );
    }

    function handleDelete(id: string) {
      setItems((prev) => {
        const target = prev.find((i) => i.id === id);
        if (target) barcodeIndex.current.delete(target.barcode);
        return prev.filter((i) => i.id !== id);
      });
    }

    function handleClear() {
      if (items.length === 0) return;
      Alert.alert(
        "Liste löschen",
        `Alle ${items.length} gescannten Artikel entfernen?`,
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Löschen",
            style: "destructive",
            onPress: () => {
              setItems([]);
              barcodeIndex.current.clear();
            },
          },
        ]
      );
    }

    function handleAction(action: BatchAction) {
      if (items.length === 0) {
        Alert.alert("Keine Artikel", "Scannen Sie zuerst Barcodes.");
        return;
      }
      onComplete(items, action);
    }

    const scanCount = items.length;
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <View style={styles.root}>
        {/* Camera fills the entire background */}
        <BarcodeCamera onScanned={handleScanned} isActive={isActive} />

        {/* Counter badge */}
        {scanCount > 0 && (
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {scanCount} {scanCount === 1 ? "Artikel" : "Artikel"} /{" "}
              {totalUnits} Stk gescannt
            </Text>
          </View>
        )}

        {/* Bottom panel */}
        <View
          style={[
            styles.panel,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "ios" ? 100 : 110),
            },
          ]}
        >
          {/* Panel header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              {scanCount === 0 ? "Bereit zum Scannen" : `${scanCount} Artikel`}
            </Text>
            {scanCount > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.clearBtnText}>Löschen</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Item rows */}
          {scanCount > 0 && (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {[...items].reverse().map((item) => (
                <BatchRow
                  key={item.id}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onDelete={handleDelete}
                />
              ))}
            </ScrollView>
          )}

          {/* Action buttons */}
          {scanCount > 0 && (
            <View style={styles.actions}>
              <ActionButton
                icon="arrow-down-circle"
                label="Alle einbuchen"
                color="#16a34a"
                onPress={() => handleAction("in")}
              />
              <ActionButton
                icon="arrow-up-circle"
                label="Alle ausbuchen"
                color="#ef4444"
                onPress={() => handleAction("out")}
              />
              <ActionButton
                icon="document-text"
                label="Zu Lieferschein"
                color="#f97316"
                onPress={() => handleAction("commission")}
              />
            </View>
          )}
        </View>
      </View>
    );
  }
);

// ── BatchRow ───────────────────────────────────────────────────────────

interface BatchRowProps {
  item: BatchItem;
  onQuantityChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}

function BatchRow({ item, onQuantityChange, onDelete }: BatchRowProps) {
  const resolved = item.materialId !== null || item.toolId !== null;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {!resolved && (
            <View style={styles.unknownBadge}>
              <Text style={styles.unknownBadgeText}>?</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowBarcode} numberOfLines={1}>
          {item.barcode}
        </Text>
      </View>

      {/* Inline quantity editor */}
      <TextInput
        style={styles.qtyInput}
        value={String(item.quantity)}
        onChangeText={(v) => onQuantityChange(item.id, v)}
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        selectTextOnFocus
        maxLength={4}
      />

      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.deleteBtn}
      >
        <Ionicons name="close-circle" size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
}

// ── ActionButton ───────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}

function ActionButton({ icon, label, color, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color + "44" }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const PANEL_BG = "rgba(10,10,14,0.93)";
const BORDER = "rgba(255,255,255,0.08)";

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  counterBadge: {
    position: "absolute",
    top: 160,
    alignSelf: "center",
    backgroundColor: "rgba(249,115,22,0.9)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 10,
  },
  counterText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PANEL_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    maxHeight: "55%",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  panelTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clearBtnText: {
    color: "#ef4444",
    fontSize: 13,
  },
  list: {
    maxHeight: 220,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 10,
  },
  rowLeft: {
    flex: 1,
  },
  rowNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  unknownBadge: {
    backgroundColor: "#6b728044",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  unknownBadgeText: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
  },
  rowBarcode: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 1,
  },
  qtyInput: {
    width: 52,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 6,
  },
  deleteBtn: {
    paddingLeft: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
