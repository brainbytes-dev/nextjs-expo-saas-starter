import { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { toast } from "burnt";
import { Ionicons } from "@expo/vector-icons";

import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Text } from "@/components/nativewindui/Text";
import { BarcodeCamera } from "@/components/barcode-camera";
import { ScanResultSheet } from "@/components/scan-result-sheet";
import { CommissionPicker, type CommissionPickerItem } from "@/components/commission-picker";
import {
  scanBarcode,
  batchStockChange,
  addCommissionEntry,
  getCommissions,
  eanLookup,
  type ScanResult,
  type Commission,
} from "@/lib/api";
import { CreateMaterialSheet } from "@/components/create-material-sheet";
import { NfcScanView } from "./nfc";
import { ArOverlay, type ArItem } from "@/components/ar-overlay";
import {
  BatchScanView,
  type BatchItem,
  type BatchAction,
  type BatchScanHandle,
} from "@/components/batch-scan-view";
import { VoiceButton } from "@/components/voice-button";
import { useColorScheme } from "@/lib/useColorScheme";

// ── Types & helpers ────────────────────────────────────────────────────

type ScanMode = "camera" | "nfc" | "ar" | "batch";

const SEGMENT_LABELS = ["Kamera", "NFC", "AR", "Batch"];

function modeFromIndex(idx: number): ScanMode {
  if (idx === 0) return "camera";
  if (idx === 1) return "nfc";
  if (idx === 2) return "ar";
  return "batch";
}

function indexFromMode(mode: ScanMode): number {
  if (mode === "camera") return 0;
  if (mode === "nfc") return 1;
  if (mode === "ar") return 2;
  return 3;
}

// ── Screen ─────────────────────────────────────────────────────────────

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

  // ── AR mode state ──────────────────────────────────────────────────────────
  const [arItems, setArItems] = useState<ArItem[]>([]);
  const [arExpandedItem, setArExpandedItem] = useState<ArItem | null>(null);
  const arScanningRef = useRef(false);

  // ── Batch mode state ───────────────────────────────────────────────────────
  const batchRef = useRef<BatchScanHandle>(null);
  const [pendingBatchItems, setPendingBatchItems] = useState<BatchItem[]>([]);
  const [batchCommissionPicking, setBatchCommissionPicking] = useState(false);
  const [batchCommissions, setBatchCommissions] = useState<Commission[]>([]);
  const [batchCommissionsLoading, setBatchCommissionsLoading] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // ── Camera scan handler (standard mode) ────────────────────────────────────

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

  // ── AR scan handler (continuous) ───────────────────────────────────────────

  const handleArScanned = useCallback(async (barcode: string) => {
    if (arScanningRef.current) return;
    arScanningRef.current = true;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await scanBarcode(barcode);
      setArItems((prev) => [
        ...prev,
        { id: String(Date.now()), barcode, result, scannedAt: Date.now() },
      ]);
    } catch {
      setArItems((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          barcode,
          result: { type: null, item: null },
          scannedAt: Date.now(),
        },
      ]);
    } finally {
      setTimeout(() => {
        arScanningRef.current = false;
      }, 1500);
    }
  }, []);

  // ── Batch stock-change handler ─────────────────────────────────────────────

  function executeBatchStock(items: BatchItem[], action: "in" | "out") {
    const resolvable = items.filter(
      (i) => i.materialId !== null && i.locationId !== null
    );
    const skipped = items.length - resolvable.length;

    if (resolvable.length === 0) {
      Alert.alert(
        "Keine Artikel buchbar",
        "Die gescannten Barcodes konnten keinen Materialien mit bekannter Lagerposition zugeordnet werden."
      );
      return;
    }

    const labelInf = action === "in" ? "einbuchen" : "ausbuchen";
    const labelPast = action === "in" ? "eingebucht" : "ausgebucht";

    Alert.alert(
      action === "in" ? "Alle einbuchen" : "Alle ausbuchen",
      `${resolvable.length} Artikel ${labelInf}?${
        skipped > 0
          ? `\n\n${skipped} Artikel ohne Lagerposition werden übersprungen.`
          : ""
      }`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Bestätigen",
          onPress: async () => {
            try {
              await batchStockChange(
                resolvable.map((i) => ({
                  materialId: i.materialId!,
                  locationId: i.locationId!,
                  changeType: action,
                  quantity: i.quantity,
                }))
              );
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              toast({
                title: `${resolvable.length} Artikel ${labelPast}`,
                preset: "done",
              });
              batchRef.current?.clear();
            } catch {
              toast({ title: "Fehler bei der Buchung", preset: "error" });
            }
          },
        },
      ]
    );
  }

  // ── Batch → commission flow ────────────────────────────────────────────────

  async function openBatchCommissionPicker(items: BatchItem[]) {
    setPendingBatchItems(items);
    setBatchCommissionPicking(true);
    setBatchCommissionsLoading(true);
    try {
      const res = await getCommissions(["open", "in_progress"]);
      setBatchCommissions(res.data);
    } catch {
      setBatchCommissions([]);
    } finally {
      setBatchCommissionsLoading(false);
    }
  }

  async function handleBatchCommissionSelect(commission: Commission) {
    if (batchSubmitting) return;
    setBatchSubmitting(true);
    try {
      await Promise.all(
        pendingBatchItems.map((item) => {
          if (item.materialId) {
            return addCommissionEntry(commission.id, {
              materialId: item.materialId,
              quantity: item.quantity,
            });
          }
          if (item.toolId) {
            return addCommissionEntry(commission.id, {
              toolId: item.toolId,
              quantity: 1,
            });
          }
          return Promise.resolve();
        })
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({
        title: "Zu Lieferschein hinzugefügt",
        message: `${pendingBatchItems.length} Artikel zu „${commission.name}"`,
        preset: "done",
      });
      setBatchCommissionPicking(false);
      setPendingBatchItems([]);
      batchRef.current?.clear();
    } catch {
      toast({ title: "Fehler beim Hinzufügen", preset: "error" });
    } finally {
      setBatchSubmitting(false);
    }
  }

  // ── Batch complete callback (from BatchScanView) ───────────────────────────

  const handleBatchComplete = useCallback(
    (items: BatchItem[], action: BatchAction) => {
      if (action === "in" || action === "out") {
        executeBatchStock(items, action);
        return;
      }
      openBatchCommissionPicker(items);
    },
    // executeBatchStock and openBatchCommissionPicker are stable function refs
    // defined in the same render scope; disable exhaustive-deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Common dismiss / action handlers ──────────────────────────────────────

  function handleDismiss() {
    setScanResult(null);
    setArExpandedItem(null);
  }

  function handleAddToCommission(
    itemType: "material" | "tool",
    itemId: string,
    quantity: number
  ) {
    setScanResult(null);
    setArExpandedItem(null);
    setPickCommissionFor({ type: itemType, id: itemId, quantity });
  }

  function handleCommissionPickerDismiss() {
    setPickCommissionFor(null);
  }

  async function handleCreateMaterial(barcode: string) {
    setScanResult(null);
    setArExpandedItem(null);
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

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeResult: ScanResult | null = arExpandedItem
    ? arExpandedItem.result
    : scanResult;
  const activeBarcode: string = arExpandedItem
    ? arExpandedItem.barcode
    : lastScannedBarcode.current;

  const nfcActive =
    scanMode === "nfc" &&
    !isLooking &&
    scanResult === null &&
    pickCommissionFor === null &&
    createBarcode === null;

  const sheetOpen =
    activeResult !== null ||
    pickCommissionFor !== null ||
    createBarcode !== null ||
    batchCommissionPicking;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header — positioned absolutely so content fills behind */}
      <View style={styles.header}>
        <LargeTitleHeader title="Scanner" backgroundColor="transparent" />
      </View>

      {/* Mode toggle */}
      <View style={styles.toggleWrapper}>
        <SegmentedControl
          values={SEGMENT_LABELS}
          selectedIndex={indexFromMode(scanMode)}
          onChange={(e) => {
            const next = modeFromIndex(e.nativeEvent.selectedSegmentIndex);
            setScanMode(next);
            if (next !== "ar") setArItems([]);
            if (next !== "batch") batchRef.current?.clear();
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

      {/* ── Camera mode ──────────────────────────────────────────────────── */}
      {scanMode === "camera" && (
        <BarcodeCamera
          onScanned={handleScanned}
          isActive={
            !isLooking &&
            scanResult === null &&
            pickCommissionFor === null &&
            createBarcode === null
          }
        />
      )}

      {/* ── NFC mode ─────────────────────────────────────────────────────── */}
      {scanMode === "nfc" && (
        <NfcScanView
          onRead={handleScanned}
          isActive={nfcActive}
          onCancel={() => setScanMode("camera")}
        />
      )}

      {/* ── AR mode ──────────────────────────────────────────────────────── */}
      {scanMode === "ar" && (
        <>
          <BarcodeCamera onScanned={handleArScanned} isActive={!sheetOpen} />
          <ArOverlay
            arItems={arItems}
            onExpandItem={(item) => setArExpandedItem(item)}
            onClearHistory={() => setArItems([])}
          />
        </>
      )}

      {/* ── Batch mode ───────────────────────────────────────────────────── */}
      {scanMode === "batch" && (
        <BatchScanView
          ref={batchRef}
          isActive={!sheetOpen}
          onComplete={handleBatchComplete}
        />
      )}

      {/* Loading spinner during standard barcode lookup */}
      {isLooking && scanMode !== "ar" && (
        <View style={styles.lookingOverlay}>
          <View className="bg-black/70 rounded-2xl px-6 py-4 items-center gap-2">
            <ActivityIndicator color="white" />
            <Text className="text-white text-sm">Suche…</Text>
          </View>
        </View>
      )}

      {/* Voice button — camera + AR modes only */}
      {(scanMode === "camera" || scanMode === "ar") && (
        <View style={styles.voiceButtonWrapper} pointerEvents="box-none">
          <VoiceButton />
        </View>
      )}

      {/* Single-item scan result sheet (camera / NFC / AR modes) */}
      <ScanResultSheet
        result={activeResult}
        scannedBarcode={activeBarcode}
        onDismiss={handleDismiss}
        onAddToCommission={handleAddToCommission}
        onCreateMaterial={handleCreateMaterial}
      />

      {/* Single-item commission picker */}
      <CommissionPicker
        item={pickCommissionFor}
        onDismiss={handleCommissionPickerDismiss}
      />

      {/* Batch commission picker */}
      {batchCommissionPicking && (
        <BatchCommissionModal
          commissions={batchCommissions}
          loading={batchCommissionsLoading}
          submitting={batchSubmitting}
          itemCount={pendingBatchItems.length}
          onSelect={handleBatchCommissionSelect}
          onDismiss={() => {
            setBatchCommissionPicking(false);
            setPendingBatchItems([]);
          }}
        />
      )}

      {/* EAN lookup spinner */}
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

// ── BatchCommissionModal ───────────────────────────────────────────────────────
//
// Lightweight bottom sheet to pick a commission for the batch items.
// Uses addCommissionEntry per item instead of the single-item CommissionPicker
// to avoid sentinel ID hacks.

interface BatchCommissionModalProps {
  commissions: Commission[];
  loading: boolean;
  submitting: boolean;
  itemCount: number;
  onSelect: (commission: Commission) => void;
  onDismiss: () => void;
}

function BatchCommissionModal({
  commissions,
  loading,
  submitting,
  itemCount,
  onSelect,
  onDismiss,
}: BatchCommissionModalProps) {
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={modalStyles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={modalStyles.sheet} className="bg-card">
        <View className="w-10 h-1 rounded-full bg-muted-foreground/30 self-center mb-4" />

        <View className="flex-row items-center justify-between mb-1">
          <Text variant="title2" className="font-bold">
            Lieferschein wählen
          </Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close-circle-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <Text className="text-muted-foreground text-sm mb-4">
          {itemCount} gescannte Artikel werden hinzugefügt.
        </Text>

        {loading ? (
          <View className="items-center py-10 gap-3">
            <ActivityIndicator />
            <Text className="text-muted-foreground text-sm">
              Lade Lieferscheine…
            </Text>
          </View>
        ) : commissions.length === 0 ? (
          <View className="items-center py-10 gap-3">
            <Ionicons name="document-text-outline" size={40} color="#6b7280" />
            <Text className="text-muted-foreground text-center text-sm">
              Keine offenen Lieferscheine vorhanden.
            </Text>
          </View>
        ) : (
          <FlatList
            data={commissions}
            keyExtractor={(c) => c.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View className="h-px bg-border mx-1" />
            )}
            renderItem={({ item: commission }) => (
              <TouchableOpacity
                onPress={() => onSelect(commission)}
                disabled={submitting}
                className="flex-row items-center justify-between py-3.5 px-1 active:opacity-60"
              >
                <View className="flex-1 gap-0.5 mr-3">
                  <Text className="font-semibold text-base" numberOfLines={1}>
                    {commission.name}
                  </Text>
                  {(commission.number ?? commission.manualNumber) ? (
                    <Text className="text-xs text-muted-foreground">
                      #{commission.manualNumber ?? commission.number}
                    </Text>
                  ) : null}
                  {commission.customerName ? (
                    <Text
                      className="text-xs text-muted-foreground"
                      numberOfLines={1}
                    >
                      {commission.customerName}
                    </Text>
                  ) : null}
                </View>

                {submitting ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                )}
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          onPress={onDismiss}
          className="mt-4 py-3 items-center"
        >
          <Text className="text-muted-foreground text-sm">Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  voiceButtonWrapper: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 25,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
});
