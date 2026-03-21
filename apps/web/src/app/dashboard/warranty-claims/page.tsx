"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { FeatureGate } from "@/components/upgrade-prompt"
import {
  IconShieldCheck,
  IconPlus,
  IconClock,
  IconSearch,
  IconCheck,
  IconX,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useOrganization } from "@/hooks/use-organization"

// ─── Types ───────────────────────────────────────────────────────────────────

type ClaimStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "resolved"

interface WarrantyClaim {
  id: string
  warrantyRecordId: string
  entityType: string
  entityId: string
  claimNumber: string | null
  reason: string
  description: string | null
  photos: string[] | null
  status: ClaimStatus
  resolution: string | null
  resolutionNotes: string | null
  submittedAt: string | null
  resolvedAt: string | null
  submittedById: string | null
  assignedToId: string | null
  createdAt: string
  updatedAt: string
  warrantyProvider: string | null
  warrantyStart: string | null
  warrantyEnd: string | null
  entityName: string | null
  submittedByName: string | null
  submittedByEmail: string | null
  assignedToName: string | null
}

interface WarrantyRecord {
  id: string
  entityType: string
  entityId: string
  provider: string | null
  warrantyStart: string | null
  warrantyEnd: string | null
  notes: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ClaimStatus,
  { labelKey: string; variant: string; className: string }
> = {
  draft: {
    labelKey: "status.draft",
    variant: "outline",
    className: "border-gray-400 text-gray-700 bg-gray-50",
  },
  submitted: {
    labelKey: "status.submitted",
    variant: "outline",
    className: "border-blue-400 text-blue-700 bg-blue-50",
  },
  in_review: {
    labelKey: "status.inReview",
    variant: "outline",
    className: "border-yellow-400 text-yellow-700 bg-yellow-50",
  },
  approved: {
    labelKey: "status.approved",
    variant: "outline",
    className: "border-green-500 text-green-700 bg-green-50",
  },
  rejected: {
    labelKey: "status.rejected",
    variant: "outline",
    className: "border-red-400 text-red-700 bg-red-50",
  },
  resolved: {
    labelKey: "status.resolved",
    variant: "outline",
    className: "border-purple-400 text-purple-700 bg-purple-50",
  },
}

const RESOLUTION_LABEL_KEYS: Record<string, string> = {
  replacement: "resolution.replacement",
  repair: "resolution.repair",
  refund: "resolution.refund",
  rejected: "resolution.rejected",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClaimStatus }) {
  const t = useTranslations("warranties")
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={config.className}>
      {t(config.labelKey)}
    </Badge>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WarrantyClaimsPage() {
  return (
    <FeatureGate featureId="warranty_claims">
      <WarrantyClaimsPageContent />
    </FeatureGate>
  )
}

function WarrantyClaimsPageContent() {
  const t = useTranslations("warranties")
  const tc = useTranslations("common")
  const { orgId } = useOrganization()

  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // New claim dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [warrantyRecords, setWarrantyRecords] = useState<WarrantyRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [newClaim, setNewClaim] = useState({
    warrantyRecordId: "",
    reason: "",
    description: "",
  })
  const [creating, setCreating] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null)
  const [updating, setUpdating] = useState(false)
  const [resolution, setResolution] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  // ─── Data fetching ───────────────────────────────────────────────────

  const fetchClaims = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch("/api/warranty-claims", {
        headers: { "x-organization-id": orgId },
      })
      if (res.ok) {
        const data = await res.json()
        setClaims(Array.isArray(data) ? data : [])
      }
    } catch {
      setClaims([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void fetchClaims()
  }, [fetchClaims])

  const fetchWarrantyRecords = useCallback(async () => {
    if (!orgId) return
    setLoadingRecords(true)
    try {
      const res = await fetch("/api/warranty", {
        headers: { "x-organization-id": orgId },
      })
      if (res.ok) {
        const data = await res.json()
        setWarrantyRecords(Array.isArray(data) ? data : [])
      }
    } catch {
      setWarrantyRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }, [orgId])

  // ─── Computed stats ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const openStatuses: ClaimStatus[] = ["draft", "submitted", "in_review"]
    const openCount = claims.filter((c) => openStatuses.includes(c.status)).length
    const approvedCount = claims.filter((c) => c.status === "approved").length

    // Average resolution time (days) for resolved claims
    const resolvedClaims = claims.filter(
      (c) => c.status === "resolved" && c.resolvedAt && c.createdAt
    )
    let avgDays = 0
    if (resolvedClaims.length > 0) {
      const totalMs = resolvedClaims.reduce((sum, c) => {
        const created = new Date(c.createdAt).getTime()
        const resolved = new Date(c.resolvedAt!).getTime()
        return sum + (resolved - created)
      }, 0)
      avgDays = Math.round(totalMs / resolvedClaims.length / (1000 * 60 * 60 * 24))
    }

    return { openCount, approvedCount, avgDays, resolvedCount: resolvedClaims.length }
  }, [claims])

  // ─── Filtered claims ────────────────────────────────────────────────

  const filteredClaims = useMemo(() => {
    if (!search.trim()) return claims
    const q = search.toLowerCase()
    return claims.filter(
      (c) =>
        c.claimNumber?.toLowerCase().includes(q) ||
        c.reason.toLowerCase().includes(q) ||
        c.entityName?.toLowerCase().includes(q)
    )
  }, [claims, search])

  // ─── Create new claim ───────────────────────────────────────────────

  const openNewDialog = () => {
    setNewClaim({ warrantyRecordId: "", reason: "", description: "" })
    setNewDialogOpen(true)
    void fetchWarrantyRecords()
  }

  const handleCreate = async () => {
    if (!orgId || !newClaim.warrantyRecordId || !newClaim.reason.trim()) return
    setCreating(true)

    const selectedRecord = warrantyRecords.find((r) => r.id === newClaim.warrantyRecordId)
    if (!selectedRecord) return

    try {
      const res = await fetch("/api/warranty-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          warrantyRecordId: newClaim.warrantyRecordId,
          entityType: selectedRecord.entityType,
          entityId: selectedRecord.entityId,
          reason: newClaim.reason.trim(),
          description: newClaim.description.trim() || undefined,
        }),
      })
      if (res.ok) {
        setNewDialogOpen(false)
        await fetchClaims()
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false)
    }
  }

  // ─── Detail dialog ──────────────────────────────────────────────────

  const openDetail = (claim: WarrantyClaim) => {
    setSelectedClaim(claim)
    setResolution(claim.resolution ?? "")
    setResolutionNotes(claim.resolutionNotes ?? "")
    setDetailOpen(true)
  }

  const updateStatus = async (newStatus: ClaimStatus, extras?: Record<string, unknown>) => {
    if (!orgId || !selectedClaim) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/warranty-claims/${selectedClaim.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({ status: newStatus, ...extras }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedClaim(updated)
        await fetchClaims()
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <IconPlus className="size-4 mr-2" />
          {t("newClaim")}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("openClaims")}
            </CardTitle>
            <IconShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-7 w-12" /> : stats.openCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("openClaimsDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("status.approved")}
            </CardTitle>
            <IconCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-7 w-12" /> : stats.approvedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("claimsApproved")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("avgProcessingTime")}
            </CardTitle>
            <IconClock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : stats.resolvedCount > 0 ? (
                t("days", { count: stats.avgDays })
              ) : (
                "—"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("avgToResolution")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconShieldCheck className="size-10 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-sm">
            {search.trim()
              ? t("noClaimsFound")
              : t("noClaimsYet")}
          </p>
          {!search.trim() && (
            <Button variant="outline" className="mt-4" onClick={openNewDialog}>
              <IconPlus className="size-4 mr-2" />
              {t("createFirst")}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("claimNumber")}</TableHead>
                <TableHead>{t("deviceMaterial")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead>{tc("status")}</TableHead>
                <TableHead>{t("submittedAt")}</TableHead>
                <TableHead>{t("assignee")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow
                  key={claim.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(claim)}
                >
                  <TableCell className="font-medium">
                    {claim.claimNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span>{claim.entityName ?? t("unknown")}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">
                        ({claim.entityType === "tool" ? t("entityTool") : t("entityMaterial")})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {claim.reason}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell>
                    {claim.submittedAt ? formatDate(claim.submittedAt) : formatDate(claim.createdAt)}
                  </TableCell>
                  <TableCell>
                    {claim.assignedToName ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── New Claim Dialog ─────────────────────────────────────────── */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newClaimTitle")}</DialogTitle>
            <DialogDescription>
              {t("newClaimDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warranty-record">{t("warrantyRecord")}</Label>
              {loadingRecords ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={newClaim.warrantyRecordId}
                  onValueChange={(v) =>
                    setNewClaim((prev) => ({ ...prev, warrantyRecordId: v }))
                  }
                >
                  <SelectTrigger id="warranty-record">
                    <SelectValue placeholder={t("selectWarrantyRecord")} />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantyRecords.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        {t("noWarrantyRecords")}
                      </SelectItem>
                    ) : (
                      warrantyRecords.map((wr) => (
                        <SelectItem key={wr.id} value={wr.id}>
                          {wr.provider ?? t("noProvider")} — {wr.entityType === "tool" ? t("entityTool") : t("entityMaterial")}{" "}
                          {wr.warrantyEnd ? `(bis ${formatDate(wr.warrantyEnd)})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-reason">{t("reason")}</Label>
              <Input
                id="claim-reason"
                placeholder={t("reasonPlaceholder")}
                value={newClaim.reason}
                onChange={(e) =>
                  setNewClaim((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-description">{t("descriptionOptional")}</Label>
              <Textarea
                id="claim-description"
                placeholder={t("descriptionPlaceholder")}
                value={newClaim.description}
                onChange={(e) =>
                  setNewClaim((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewDialogOpen(false)}
              disabled={creating}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newClaim.warrantyRecordId || !newClaim.reason.trim()}
            >
              {creating ? t("creating") : t("createClaim")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedClaim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedClaim.claimNumber ?? t("warrantyClaim")}
                  <StatusBadge status={selectedClaim.status} />
                </DialogTitle>
                <DialogDescription>
                  {selectedClaim.entityName ?? t("unknown")} ({selectedClaim.entityType === "tool" ? t("entityTool") : t("entityMaterial")})
                  {selectedClaim.warrantyProvider && ` — ${selectedClaim.warrantyProvider}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">{t("reason")}</span>
                  <span>{selectedClaim.reason}</span>

                  {selectedClaim.description && (
                    <>
                      <span className="text-muted-foreground">{t("description")}</span>
                      <span>{selectedClaim.description}</span>
                    </>
                  )}

                  <span className="text-muted-foreground">{t("submittedBy")}</span>
                  <span>
                    {selectedClaim.submittedByName ?? selectedClaim.submittedByEmail ?? "—"}
                  </span>

                  <span className="text-muted-foreground">{t("assignee")}</span>
                  <span>{selectedClaim.assignedToName ?? "—"}</span>

                  <span className="text-muted-foreground">{t("warrantyPeriod")}</span>
                  <span>
                    {selectedClaim.warrantyStart || selectedClaim.warrantyEnd
                      ? `${formatDate(selectedClaim.warrantyStart)} – ${formatDate(selectedClaim.warrantyEnd)}`
                      : "—"}
                  </span>
                </div>

                {/* Status Timeline */}
                <div className="space-y-1.5">
                  <h4 className="text-sm font-medium">{t("timeline")}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-gray-400" />
                      <span>{t("createdAt", { date: formatDateTime(selectedClaim.createdAt) })}</span>
                    </div>
                    {selectedClaim.submittedAt && (
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-blue-400" />
                        <span>{t("submittedAtDate", { date: formatDateTime(selectedClaim.submittedAt) })}</span>
                      </div>
                    )}
                    {selectedClaim.status === "in_review" && (
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-yellow-400" />
                        <span>{t("status.inReview")}</span>
                      </div>
                    )}
                    {(selectedClaim.status === "approved" || selectedClaim.status === "resolved") && (
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-green-500" />
                        <span>{t("status.approved")}</span>
                      </div>
                    )}
                    {selectedClaim.status === "rejected" && (
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-red-500" />
                        <span>{t("status.rejected")}</span>
                      </div>
                    )}
                    {selectedClaim.resolvedAt && (
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-purple-500" />
                        <span>{t("resolvedAtDate", { date: formatDateTime(selectedClaim.resolvedAt) })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution section (for approved claims) */}
                {selectedClaim.status === "approved" && (
                  <div className="space-y-3 rounded-md border p-3">
                    <h4 className="text-sm font-medium">{t("resolutionTitle")}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-type">{t("resolutionType")}</Label>
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger id="resolution-type">
                          <SelectValue placeholder={t("selectResolution")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="replacement">{t("resolution.replacement")}</SelectItem>
                          <SelectItem value="repair">{t("resolution.repair")}</SelectItem>
                          <SelectItem value="refund">{t("resolution.refund")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-notes">{t("resolutionNotes")}</Label>
                      <Textarea
                        id="resolution-notes"
                        placeholder={t("resolutionNotesPlaceholder")}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Show resolution info for resolved claims */}
                {selectedClaim.status === "resolved" && selectedClaim.resolution && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("resolutionTitle")}:</span>
                      <span className="font-medium">
                        {RESOLUTION_LABEL_KEYS[selectedClaim.resolution] ? t(RESOLUTION_LABEL_KEYS[selectedClaim.resolution]) : selectedClaim.resolution}
                      </span>
                    </div>
                    {selectedClaim.resolutionNotes && (
                      <p className="text-muted-foreground">{selectedClaim.resolutionNotes}</p>
                    )}
                  </div>
                )}

                {/* Action buttons based on status */}
                <div className="flex gap-2 flex-wrap">
                  {selectedClaim.status === "draft" && (
                    <Button
                      onClick={() => updateStatus("submitted")}
                      disabled={updating}
                    >
                      {updating ? t("submitting") : t("submit")}
                    </Button>
                  )}

                  {selectedClaim.status === "submitted" && (
                    <Button
                      onClick={() => updateStatus("in_review")}
                      disabled={updating}
                    >
                      <IconClock className="size-4 mr-1" />
                      {updating ? t("updating") : t("takeInReview")}
                    </Button>
                  )}

                  {selectedClaim.status === "in_review" && (
                    <>
                      <Button
                        onClick={() => updateStatus("approved")}
                        disabled={updating}
                      >
                        <IconCheck className="size-4 mr-1" />
                        {updating ? "..." : t("approve")}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => updateStatus("rejected")}
                        disabled={updating}
                      >
                        <IconX className="size-4 mr-1" />
                        {updating ? "..." : t("reject")}
                      </Button>
                    </>
                  )}

                  {selectedClaim.status === "approved" && (
                    <Button
                      onClick={() =>
                        updateStatus("resolved", {
                          resolution: resolution || undefined,
                          resolutionNotes: resolutionNotes.trim() || undefined,
                        })
                      }
                      disabled={updating || !resolution}
                    >
                      <IconCheck className="size-4 mr-1" />
                      {updating ? t("saving") : t("markResolved")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
