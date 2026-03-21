import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toast } from "burnt";

import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";
import type { WarrantyClaim } from "@/lib/api-types";

// ── Status config ─────────────────────────────────────────────────────

type ClaimStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "resolved";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  draft: { label: "Entwurf", color: "#6b7280", bg: "#f3f4f6", icon: "document-outline" },
  submitted: { label: "Eingereicht", color: "#3b82f6", bg: "#eff6ff", icon: "paper-plane" },
  in_review: { label: "In Prüfung", color: "#eab308", bg: "#fefce8", icon: "hourglass" },
  approved: { label: "Genehmigt", color: "#16a34a", bg: "#f0fdf4", icon: "checkmark-circle" },
  rejected: { label: "Abgelehnt", color: "#ef4444", bg: "#fef2f2", icon: "close-circle" },
  resolved: { label: "Erledigt", color: "#8b5cf6", bg: "#f5f3ff", icon: "checkmark-done" },
};

const STATUS_FLOW: ClaimStatus[] = ["draft", "submitted", "in_review", "approved", "rejected", "resolved"];

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "---";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(iso: string | null) {
  if (!iso) return "---";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getStatusIndex(status: string): number {
  return STATUS_FLOW.indexOf(status as ClaimStatus);
}

// ── Screen ────────────────────────────────────────────────────────────

export default function WarrantyClaimsScreen() {
  const { colors } = useColorScheme();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await api.get<{ data: WarrantyClaim[] }>("/api/warranty-claims");
      setClaims(res.data);
    } catch {
      // Keep last known data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClaims();
  }, [fetchClaims]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Title */}
        <Text variant="largeTitle" className="font-bold">
          Garantieansprüche
        </Text>

        {/* Content */}
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : claims.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Ionicons name="shield-outline" size={48} color={colors.grey3} />
            <Text className="text-muted-foreground text-sm">
              Keine Garantieansprüche vorhanden
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedClaim(claim);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB — Neuen Anspruch stellen */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreateForm(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Detail Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          visible={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}

      {/* Create Form Modal */}
      <CreateClaimModal
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreated={(newClaim) => {
          setClaims((prev) => [newClaim, ...prev]);
          setShowCreateForm(false);
        }}
      />
    </SafeAreaView>
  );
}

// ── ClaimCard ─────────────────────────────────────────────────────────

function ClaimCard({
  claim,
  onPress,
}: {
  claim: WarrantyClaim;
  onPress: () => void;
}) {
  const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.draft;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View className="flex-row items-center gap-3">
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        {/* Info */}
        <View className="flex-1 gap-0.5">
          <Text className="font-semibold text-[15px]" numberOfLines={1}>
            {claim.claimNumber}
          </Text>
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {claim.entityName}
          </Text>
        </View>

        {/* Right */}
        <View className="items-end gap-1">
          <ClaimStatusBadge status={claim.status} />
          <Text className="text-xs text-muted-foreground">
            {formatDateShort(claim.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── ClaimStatusBadge ──────────────────────────────────────────────────

function ClaimStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ── ClaimDetailModal ─────────────────────────────────────────────────

function ClaimDetailModal({
  claim,
  visible,
  onClose,
}: {
  claim: WarrantyClaim;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useColorScheme();
  const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.draft;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/30">
          <Text variant="heading" className="font-bold">
            Anspruch
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close-circle" size={28} color={colors.grey2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        >
          {/* Claim Info */}
          <View style={styles.section}>
            <Text variant="subhead" className="font-semibold mb-2">
              Anspruchsinformationen
            </Text>
            <InfoRow label="Nummer" value={claim.claimNumber} />
            <InfoRow label="Gegenstand" value={claim.entityName} />
            <InfoRow label="Typ" value={claim.entityType} />
            <InfoRow label="Grund" value={claim.reason} />
            {claim.description && (
              <View className="mt-2">
                <Text className="text-xs text-muted-foreground mb-1">Beschreibung</Text>
                <Text className="text-sm">{claim.description}</Text>
              </View>
            )}
          </View>

          {/* Status Timeline */}
          <View style={styles.section}>
            <Text variant="subhead" className="font-semibold mb-3">
              Status-Verlauf
            </Text>
            <ClaimStatusTimeline currentStatus={claim.status} />
          </View>

          {/* Resolution */}
          {claim.resolution && (
            <View style={styles.section}>
              <Text variant="subhead" className="font-semibold mb-2">
                Ergebnis
              </Text>
              <View
                style={[
                  styles.resolutionBox,
                  {
                    backgroundColor: cfg.bg,
                    borderColor: cfg.color + "40",
                  },
                ]}
              >
                <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                <Text className="text-sm flex-1">{claim.resolution}</Text>
              </View>
            </View>
          )}

          {/* Dates */}
          <View style={styles.section}>
            <Text variant="subhead" className="font-semibold mb-2">
              Daten
            </Text>
            <InfoRow label="Erstellt" value={formatDate(claim.createdAt)} />
            <InfoRow label="Eingereicht" value={formatDate(claim.submittedAt)} />
            <InfoRow label="Abgeschlossen" value={formatDate(claim.resolvedAt)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── ClaimStatusTimeline ──────────────────────────────────────────────

function ClaimStatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = getStatusIndex(currentStatus);
  // Show a linear timeline. If rejected, show draft->submitted->in_review->rejected
  // If approved/resolved, show draft->submitted->in_review->approved->resolved
  const isRejected = currentStatus === "rejected";
  const steps: ClaimStatus[] = isRejected
    ? ["draft", "submitted", "in_review", "rejected"]
    : ["draft", "submitted", "in_review", "approved", "resolved"];

  return (
    <View style={{ gap: 0 }}>
      {steps.map((status, idx) => {
        const cfg = STATUS_CONFIG[status];
        const stepIdx = getStatusIndex(status);
        const isCompleted = stepIdx <= currentIdx;
        const isCurrent = status === currentStatus;
        const isLast = idx === steps.length - 1;

        return (
          <View key={status} className="flex-row" style={{ minHeight: 48 }}>
            {/* Dot + Line */}
            <View className="items-center" style={{ width: 32 }}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isCompleted ? cfg.color : "#d1d5db",
                    borderColor: isCurrent ? cfg.color : "transparent",
                    borderWidth: isCurrent ? 3 : 0,
                  },
                ]}
              >
                {isCompleted && !isCurrent && (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor: isCompleted && !isCurrent ? cfg.color : "#e5e7eb",
                    },
                  ]}
                />
              )}
            </View>

            {/* Label */}
            <View className="flex-1 pb-3 pl-2">
              <Text
                style={{
                  fontWeight: isCurrent ? "700" : "500",
                  fontSize: 14,
                  color: isCompleted ? cfg.color : "#9ca3af",
                }}
              >
                {cfg.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── CreateClaimModal ─────────────────────────────────────────────────

function CreateClaimModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (claim: WarrantyClaim) => void;
}) {
  const { colors } = useColorScheme();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast({ title: "Bitte Grund angeben", preset: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const newClaim = await api.post<WarrantyClaim>("/api/warranty-claims", {
        reason: reason.trim(),
        description: description.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast({ title: "Anspruch erstellt" });
      setReason("");
      setDescription("");
      onCreated(newClaim);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast({ title: "Fehler beim Erstellen", preset: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/30">
            <Text variant="heading" className="font-bold">
              Neuer Anspruch
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={colors.grey2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Reason */}
            <View style={{ gap: 6 }}>
              <Text className="text-sm font-semibold">Grund *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.grey4,
                  },
                ]}
                placeholder="z.B. Defektes Display, Motorschaden..."
                placeholderTextColor={colors.grey3}
                value={reason}
                onChangeText={setReason}
                autoFocus
              />
            </View>

            {/* Description */}
            <View style={{ gap: 6 }}>
              <Text className="text-sm font-semibold">Beschreibung</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.grey4,
                  },
                ]}
                placeholder="Detaillierte Beschreibung des Problems..."
                placeholderTextColor={colors.grey3}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                    Anspruch einreichen
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5 border-b border-border/20">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium" numberOfLines={1} style={{ maxWidth: "55%" }}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  section: {
    gap: 0,
  },
  resolutionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
});
