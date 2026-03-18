/**
 * AR Overlay — "Smart Camera" info cards displayed over the live camera feed.
 *
 * When a barcode is scanned in AR mode this component renders:
 *   - A floating card near the bottom showing item name, stock, and location.
 *   - A colour-coded status strip (green / orange / red).
 *   - A fade-in animation; auto-dismiss after AUTO_DISMISS_MS.
 *   - A stacked history of the last MAX_HISTORY items.
 *   - A "swipe-up" history panel showing all scanned items in this session.
 *
 * The component is purely presentational — the parent (scanner.tsx) drives it
 * via `arItems` and the `onExpandItem` / `onClearHistory` callbacks.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/nativewindui/Text";
import type { ScanResult } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArItem {
  id: string; // unique per scan (Date.now() string)
  barcode: string;
  result: ScanResult;
  scannedAt: number;
}

interface ArOverlayProps {
  /** All scanned items in this AR session (oldest first). */
  arItems: ArItem[];
  /** Called when user taps a card to open the full ScanResultSheet. */
  onExpandItem: (item: ArItem) => void;
  /** Clear the scan history. */
  onClearHistory: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5000;
const MAX_STACKED_CARDS = 3;

// ── Helper: stock status ──────────────────────────────────────────────────────

type StockStatus = "ok" | "low" | "empty";

function getStockStatus(item: Record<string, unknown> | null): StockStatus {
  if (!item) return "empty";
  const stock = item.totalStock as number | undefined;
  const min = (item.minQuantity as number | undefined) ?? 0;
  if (stock === undefined) return "ok"; // tool or key — no stock concept
  if (stock <= 0) return "empty";
  if (stock <= min) return "low";
  return "ok";
}

const STATUS_COLORS: Record<StockStatus, { bg: string; text: string; label: string }> = {
  ok: { bg: "#16a34a", text: "#fff", label: "OK" },
  low: { bg: "#f97316", text: "#fff", label: "Niedrig" },
  empty: { bg: "#dc2626", text: "#fff", label: "Leer" },
};

function itemName(result: ScanResult): string {
  return (result.item?.name as string | undefined) ?? "Unbekannt";
}

function itemStock(result: ScanResult): string {
  const item = result.item;
  if (!item) return "";
  const stock = item.totalStock as number | undefined;
  const unit = (item.unit as string | undefined) ?? "Stk";
  if (stock !== undefined) return `${stock} ${unit}`;
  const condition = item.condition as string | undefined;
  if (condition) return condition;
  return "";
}

function itemLocation(result: ScanResult): string {
  const item = result.item;
  if (!item) return "";
  return (
    (item.mainLocationName as string | undefined) ??
    (item.locationName as string | undefined) ??
    ""
  );
}

function itemTypeBadge(result: ScanResult): string {
  switch (result.type) {
    case "material":
      return "Material";
    case "tool":
      return "Werkzeug";
    case "key":
      return "Schlüssel";
    default:
      return "Unbekannt";
  }
}

// ── Single floating card ──────────────────────────────────────────────────────

interface FloatingCardProps {
  item: ArItem;
  stackIndex: number; // 0 = top (newest), 1, 2
  total: number;
  onPress: () => void;
  onDismiss: (id: string) => void;
}

function FloatingCard({
  item,
  stackIndex,
  total,
  onPress,
  onDismiss,
}: FloatingCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Fade + slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
    ]).start();

    // Auto-dismiss after AUTO_DISMISS_MS (only for the newest card)
    if (stackIndex === 0) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onDismiss(item.id));
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, []);

  const status = getStockStatus(item.result.item);
  const statusCfg = STATUS_COLORS[status];

  // Stack older cards slightly behind and above
  const cardScale = 1 - stackIndex * 0.04;
  const cardTranslateY = -stackIndex * 8;

  if (item.result.type === null) {
    // Not-found mini card
    return (
      <Animated.View
        style={[
          styles.card,
          styles.cardNotFound,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: Animated.add(translateY, new Animated.Value(cardTranslateY)) },
              { scale: cardScale },
            ],
            zIndex: MAX_STACKED_CARDS - stackIndex,
          },
        ]}
      >
        <View style={styles.cardRow}>
          <Ionicons name="help-circle-outline" size={18} color="#9ca3af" />
          <Text style={styles.cardNotFoundText}>Barcode nicht gefunden</Text>
          <TouchableOpacity
            onPress={() => onDismiss(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: Animated.multiply(fadeAnim, new Animated.Value(1 - stackIndex * 0.2)),
          transform: [
            { translateY: Animated.add(translateY, new Animated.Value(cardTranslateY)) },
            { scale: cardScale },
          ],
          zIndex: MAX_STACKED_CARDS - stackIndex,
        },
      ]}
    >
      {/* Colour status strip on left edge */}
      <View style={[styles.statusStrip, { backgroundColor: statusCfg.bg }]} />

      <TouchableOpacity style={styles.cardInner} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: statusCfg.bg + "22" }]}>
            <Text style={[styles.typeBadgeText, { color: statusCfg.bg }]}>
              {itemTypeBadge(item.result)}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
            <Text style={styles.statusPillText}>{statusCfg.label}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onDismiss(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.dismissBtn}
          >
            <Ionicons name="close" size={14} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardName} numberOfLines={1}>
          {itemName(item.result)}
        </Text>

        <View style={styles.cardMeta}>
          {itemStock(item.result) ? (
            <View style={styles.metaRow}>
              <Ionicons name="cube-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText}>{itemStock(item.result)}</Text>
            </View>
          ) : null}
          {itemLocation(item.result) ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText} numberOfLines={1}>
                {itemLocation(item.result)}
              </Text>
            </View>
          ) : null}
        </View>

        {stackIndex === 0 && (
          <Text style={styles.tapHint}>Tippen für Details</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── History panel ─────────────────────────────────────────────────────────────

interface HistoryPanelProps {
  items: ArItem[];
  onExpandItem: (item: ArItem) => void;
  onClose: () => void;
  onClearAll: () => void;
}

function HistoryPanel({ items, onExpandItem, onClose, onClearAll }: HistoryPanelProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, []);

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  }

  const reversed = [...items].reverse();

  return (
    <Animated.View
      style={[styles.historyPanel, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>{items.length} Artikel gescannt</Text>
        <View style={styles.historyActions}>
          <TouchableOpacity onPress={onClearAll} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={styles.clearBtnText}>Löschen</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.historyScroll}>
        {reversed.map((item) => {
          const status = getStockStatus(item.result.item);
          const cfg = STATUS_COLORS[status];
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.historyRow}
              onPress={() => onExpandItem(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.historyDot, { backgroundColor: cfg.bg }]} />
              <View style={styles.historyRowContent}>
                <Text style={styles.historyRowName} numberOfLines={1}>
                  {item.result.type === null ? "Nicht gefunden" : itemName(item.result)}
                </Text>
                <Text style={styles.historyRowMeta}>
                  {item.result.type !== null
                    ? `${itemTypeBadge(item.result)} · ${itemStock(item.result) || "—"}`
                    : item.barcode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#6b7280" />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ArOverlay({ arItems, onExpandItem, onClearHistory }: ArOverlayProps) {
  const insets = useSafeAreaInsets();
  // Locally dismissed card IDs (not removed from parent history, just hidden)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  // Visible cards = not dismissed, newest first, max MAX_STACKED_CARDS
  const visibleCards = arItems
    .filter((item) => !dismissed.has(item.id))
    .slice(-MAX_STACKED_CARDS)
    .reverse(); // newest first

  const scanCount = arItems.length;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Counter badge — top-right */}
      {scanCount > 0 && (
        <View style={[styles.counterBadge, { top: insets.top + 160 }]}>
          <Text style={styles.counterText}>{scanCount} Artikel gescannt</Text>
        </View>
      )}

      {/* History button — bottom left above cards */}
      {scanCount > 0 && !showHistory && (
        <TouchableOpacity
          style={[
            styles.historyBtn,
            { bottom: insets.bottom + 200 },
          ]}
          onPress={() => setShowHistory(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="list-outline" size={16} color="#fff" />
          <Text style={styles.historyBtnText}>Verlauf</Text>
        </TouchableOpacity>
      )}

      {/* Stacked floating cards */}
      {!showHistory && (
        <View
          style={[
            styles.cardsContainer,
            { bottom: insets.bottom + 100 },
          ]}
          pointerEvents="box-none"
        >
          {visibleCards.map((item, idx) => (
            <FloatingCard
              key={item.id}
              item={item}
              stackIndex={idx}
              total={visibleCards.length}
              onPress={() => onExpandItem(item)}
              onDismiss={handleDismiss}
            />
          ))}
        </View>
      )}

      {/* History panel (swipe-up) */}
      {showHistory && (
        <View
          style={[styles.historyPanelWrapper, { paddingBottom: insets.bottom }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowHistory(false)}
          />
          <HistoryPanel
            items={arItems}
            onExpandItem={(item) => {
              setShowHistory(false);
              onExpandItem(item);
            }}
            onClose={() => setShowHistory(false)}
            onClearAll={() => {
              onClearHistory();
              setDismissed(new Set());
              setShowHistory(false);
            }}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  counterBadge: {
    position: "absolute",
    right: 16,
    backgroundColor: "rgba(249,115,22,0.9)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  historyBtn: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  historyBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  cardsContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "stretch",
  },
  card: {
    position: "relative",
    backgroundColor: "rgba(15,15,20,0.88)",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: "row",
  },
  cardNotFound: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cardNotFoundText: {
    color: "#9ca3af",
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  statusStrip: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardInner: {
    flex: 1,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  dismissBtn: {
    marginLeft: "auto",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  cardName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  tapHint: {
    color: "rgba(249,115,22,0.8)",
    fontSize: 11,
    marginTop: 4,
  },
  // History panel
  historyPanelWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: "flex-end",
  },
  historyPanel: {
    backgroundColor: "rgba(15,15,20,0.96)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "55%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  historyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  historyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
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
  historyScroll: {
    paddingHorizontal: 16,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyRowContent: {
    flex: 1,
  },
  historyRowName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  historyRowMeta: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 1,
  },
});
