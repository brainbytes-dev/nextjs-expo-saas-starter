"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconTool,
  IconLogin,
  IconLogout,
  IconCalendar,
  IconUser,
  IconMapPin,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconTag,
  IconCurrencyEuro,
  IconCertificate,
  IconPlus,
  IconClockHour4,
  IconChecklist,
} from "@tabler/icons-react"
import { ChecklistStep } from "@/components/checklist-step"
import { BookingPhotoButton } from "@/components/booking-photo-button"
import {
  type ChecklistItem,
  type ChecklistResult,
  initChecklistResults,
  isChecklistComplete,
} from "@/lib/checklist"
import { BookingPhotosInline } from "@/components/booking-photos-inline"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { QrCodeDisplay } from "@/components/qr-code"
import { ZebraLabelButton } from "@/components/zebra-label-button"
import { BarcodeLabel } from "@/components/barcode-label"
import { CommentsThread } from "@/components/comments-thread"
import { CustomFieldsSection } from "@/components/custom-fields"
import { InsuranceWarrantyPanel } from "@/components/insurance-warranty-panel"
import { AttachmentsPanel } from "@/components/attachments-panel"
import { ReservationPanel } from "@/components/reservation-panel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ToolCondition = "good" | "damaged" | "repair" | "decommissioned"

interface ToolGroup {
  id: string
  name: string
  color: string | null
  pickupChecklist: ChecklistItem[] | null
  returnChecklist: ChecklistItem[] | null
}

interface Location {
  id: string
  name: string
}

interface ToolBooking {
  id: string
  toolId: string
  bookingType: string
  fromLocationId: string | null
  toLocationId: string | null
  userId: string | null
  notes: string | null
  checklistResult: ChecklistResult[] | null
  createdAt: string
}

interface DepreciationRow {
  year: number
  startValue: number
  depreciation: number
  endValue: number
  accumulatedDepreciation: number
}

interface DepreciationData {
  purchasePrice: number
  salvageValue: number
  lifeYears: number
  method: string
  purchaseDate: string | null
  currentBookValue: number
  schedule: DepreciationRow[]
  tco: { purchase: number; maintenance: number; insurance: number; total: number }
}

interface CalibrationRecord {
  id: string
  calibratedAt: string
  calibratedByName: string | null
  nextCalibrationDate: string | null
  certificateUrl: string | null
  result: string | null
  notes: string | null
}

interface ToolDetail {
  id: string
  number: string | null
  name: string
  image: string | null
  groupId: string | null
  groupName: string | null
  homeLocationId: string | null
  homeLocationName: string | null
  assignedToId: string | null
  assignedUserName: string | null
  assignedLocationId: string | null
  barcode: string | null
  manufacturer: string | null
  manufacturerNumber: string | null
  serialNumber: string | null
  condition: ToolCondition | null
  maintenanceIntervalDays: number | null
  lastMaintenanceDate: string | null
  nextMaintenanceDate: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  recentBookings: ToolBooking[]
  purchasePrice: number | null
  purchaseDate: string | null
  expectedLifeYears: number | null
  salvageValue: number | null
  depreciationMethod: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const conditionClassNames: Record<ToolCondition, string> = {
  good: "bg-secondary/10 text-secondary border-transparent",
  damaged: "bg-primary/10 text-primary border-transparent",
  repair: "bg-destructive/10 text-destructive border-transparent",
  decommissioned: "bg-muted text-muted-foreground border-transparent",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isMaintenanceOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ToolDetailPage() {
  const t = useTranslations("tools")
  const tc = useTranslations("common")
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const toolId = params.id

  // Data state
  const [tool, setTool] = useState<ToolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [form, setForm] = useState<Partial<ToolDetail>>({})
  const [isEditing, setIsEditing] = useState(false)

  // Reference data
  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  // Dialog state
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [checkoutUserId, setCheckoutUserId] = useState("")
  const [checkoutLocationId, setCheckoutLocationId] = useState("")
  const [checkoutNotes, setCheckoutNotes] = useState("")
  const [checkinCondition, setCheckinCondition] = useState("good")
  const [checkinNotes, setCheckinNotes] = useState("")

  // Finanzen / Depreciation
  const [deprData, setDeprData] = useState<DepreciationData | null>(null)
  const [deprLoading, setDeprLoading] = useState(false)
  // Kalibrierung
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([])
  const [calibLoading, setCalibLoading] = useState(false)
  const [showCalibForm, setShowCalibForm] = useState(false)
  const [calibForm, setCalibForm] = useState({ calibratedAt: "", nextCalibrationDate: "", certificateUrl: "", result: "pass", notes: "" })
  const [calibSaving, setCalibSaving] = useState(false)

  // Checklist state for checkout
  const [checkoutChecklist, setCheckoutChecklist] = useState<ChecklistResult[]>([])
  // Checklist state for checkin
  const [checkinChecklist, setCheckinChecklist] = useState<ChecklistResult[]>([])
  // Photo state (file + object URL) for checkout
  const [checkoutPhotoFile, setCheckoutPhotoFile] = useState<File | null>(null)
  const [checkoutPhotoUrl, setCheckoutPhotoUrl] = useState<string | null>(null)
  // Photo state (file + object URL) for checkin
  const [checkinPhotoFile, setCheckinPhotoFile] = useState<File | null>(null)
  const [checkinPhotoUrl, setCheckinPhotoUrl] = useState<string | null>(null)

  // Pending approval state
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch everything
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [toolRes, groupsRes, locsRes, deprRes] = await Promise.all([
          fetch(`/api/tools/${toolId}`),
          fetch("/api/tool-groups"),
          fetch("/api/locations"),
          fetch(`/api/tools/${toolId}/depreciation`),
        ])

        if (toolRes.ok) {
          const d = await toolRes.json()
          setTool(d)
          setForm(d)
        }
        if (groupsRes.ok) {
          const g = await groupsRes.json()
          setGroups(Array.isArray(g) ? g : (g.data ?? []))
        }
        if (locsRes.ok) {
          const l = await locsRes.json()
          setLocations(Array.isArray(l) ? l : (l.data ?? []))
        }
        if (deprRes.ok) {
          setDeprData(await deprRes.json())
        }
      } catch {
        // TODO: handle error
      } finally {
        setLoading(false)
        setDeprLoading(false)
      }
    }
    load()
  }, [toolId])

  const fetchCalibrations = async () => {
    setCalibLoading(true)
    try {
      const r = await fetch(`/api/tools/${toolId}/calibrations`)
      if (r.ok) {
        const d = await r.json()
        setCalibrations(d.data ?? [])
      }
    } catch { /* silently fail */ } finally { setCalibLoading(false) }
  }

  // Save handler
  const handleSave = useCallback(async () => {
    if (!tool) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          number: form.number,
          groupId: form.groupId,
          homeLocationId: form.homeLocationId,
          barcode: form.barcode,
          manufacturer: form.manufacturer,
          manufacturerNumber: form.manufacturerNumber,
          serialNumber: form.serialNumber,
          condition: form.condition,
          maintenanceIntervalDays: form.maintenanceIntervalDays,
          notes: form.notes,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        // Re-fetch to get joined fields (groupName, homeLocationName, etc.)
        const detailRes = await fetch(`/api/tools/${toolId}`)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          setTool(detail)
          setForm(detail)
        } else {
          setTool((prev) => prev ? { ...prev, ...updated } : null)
          setForm((prev) => ({ ...prev, ...updated }))
        }
        setIsEditing(false)
      }
    } catch {
      // TODO: toast
    } finally {
      setSaving(false)
    }
  }, [tool, toolId, form])

  // Delete handler
  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/tools/${toolId}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/dashboard/tools")
      }
    } catch {
      // TODO: toast
    } finally {
      setDeleting(false)
    }
  }, [toolId, router])

  const handleCalibSave = async () => {
    if (!calibForm.calibratedAt) return
    setCalibSaving(true)
    try {
      const res = await fetch(`/api/tools/${toolId}/calibrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calibratedAt: calibForm.calibratedAt,
          nextCalibrationDate: calibForm.nextCalibrationDate || null,
          certificateUrl: calibForm.certificateUrl || null,
          result: calibForm.result || null,
          notes: calibForm.notes || null,
        }),
      })
      if (res.ok) {
        setShowCalibForm(false)
        setCalibForm({ calibratedAt: "", nextCalibrationDate: "", certificateUrl: "", result: "pass", notes: "" })
        await fetchCalibrations()
      }
    } catch { /* silently fail */ } finally { setCalibSaving(false) }
  }

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-lg font-medium">{t("notFound")}</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/tools")}
        >
          <IconArrowLeft className="size-4" />
          {tc("back")}
        </Button>
      </div>
    )
  }

  const condClassName = tool.condition ? conditionClassNames[tool.condition] : null
  const condLabel = tool.condition ? t(`conditions.${tool.condition}`) : null
  const maintenanceOverdue = isMaintenanceOverdue(tool.nextMaintenanceDate)
  const isHome = !tool.assignedToId && !tool.assignedLocationId

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/tools")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {tool.image ? (
              <Image
                src={tool.image}
                alt={tool.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <IconTool className="size-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {tool.name}
              </h1>
              {condClassName && (
                <Badge variant="outline" className={`text-xs ${condClassName}`}>
                  {condLabel}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {tool.number && (
                <span className="font-mono">{tool.number} &middot; </span>
              )}
              {tool.groupName ?? t("group")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/tools/labels")}
          >
            <IconTag className="size-4" />
            {t("labels")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const el = document.getElementById("reservation-panel-anchor")
              el?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          >
            <IconCalendar className="size-4" />
            {t("reserve")}
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(tool)
                  setIsEditing(false)
                }}
              >
                {tc("cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <IconDeviceFloppy className="size-4" />
                {saving ? tc("loading") : tc("save")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <IconEdit className="size-4" />
                {tc("edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <IconTrash className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Pending approval banner */}
      {pendingApproval && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <IconClockHour4 className="size-5 shrink-0 text-yellow-600" />
          <div className="flex-1">
            <span className="font-medium">{t("pendingApproval")}</span> &mdash; {t("pendingApprovalDesc")}
          </div>
          <button
            className="shrink-0 text-yellow-600 hover:text-yellow-800 underline text-xs"
            onClick={() => setPendingApproval(null)}
          >
            {t("dismissLabel")}
          </button>
        </div>
      )}

      {/* Status Card + Check-in/Check-out */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${
                      isHome ? "bg-secondary" : "bg-primary"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {isHome ? (
                      <span className="text-secondary">
                        {t("isHome")} &mdash; {tool.homeLocationName ?? "\u2014"}
                      </span>
                    ) : (
                      <span className="text-primary">
                        {t("checkedOut")} &mdash; {tool.assignedUserName ?? "\u2014"}
                      </span>
                    )}
                  </span>
                </div>
                {!isHome && tool.assignedLocationId && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IconMapPin className="size-3.5" />
                    {t("locationId", { id: tool.assignedLocationId })}
                  </p>
                )}
                {maintenanceOverdue && (
                  <p className="flex items-center gap-1 text-sm font-medium text-destructive">
                    <IconAlertTriangle className="size-3.5" />
                    {t("maintenanceOverdue", { date: formatDate(tool.nextMaintenanceDate) })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isHome ? (
                <Button
                  size="lg"
                  onClick={() => {
                    const grp = groups.find((g) => g.id === tool.groupId)
                    const items = grp?.pickupChecklist ?? []
                    setCheckoutChecklist(initChecklistResults(items))
                    setCheckoutOpen(true)
                  }}
                >
                  <IconLogout className="size-5" />
                  {t("checkOut")}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    const grp = groups.find((g) => g.id === tool.groupId)
                    const items = grp?.returnChecklist ?? []
                    setCheckinChecklist(initChecklistResults(items))
                    setCheckinOpen(true)
                  }}
                >
                  <IconLogin className="size-5" />
                  {t("checkIn")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("lastMaintenance")}
            </p>
            <p className="mt-1 text-lg font-bold">
              {formatDate(tool.lastMaintenanceDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("nextMaintenance")}
            </p>
            <p
              className={`mt-1 text-lg font-bold ${
                maintenanceOverdue ? "text-destructive" : ""
              }`}
            >
              {formatDate(tool.nextMaintenanceDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("interval")}
            </p>
            <p className="mt-1 text-lg font-bold">
              {tool.maintenanceIntervalDays
                ? t("intervalDays", { count: tool.maintenanceIntervalDays })
                : "\u2014"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("bookings")}
            </p>
            <p className="mt-1 text-lg font-bold">
              {tool.recentBookings?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("tabs.bookingHistory")}</TabsTrigger>
          <TabsTrigger value="maintenance">{t("tabs.maintenance")}</TabsTrigger>
          <TabsTrigger value="qr">{t("tabs.qr")}</TabsTrigger>
          <TabsTrigger value="insurance">{t("tabs.insurance")}</TabsTrigger>
          <TabsTrigger value="attachments">{t("tabs.attachments")}</TabsTrigger>
          <TabsTrigger value="comments">{t("tabs.comments")}</TabsTrigger>
        </TabsList>

        {/* ─── General Tab ─────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card>
            <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                {isEditing ? (
                  <Input
                    value={form.name ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm">{tool.name}</p>
                )}
              </div>

              {/* Nummer */}
              <div className="space-y-2">
                <Label>{t("number")}</Label>
                {isEditing ? (
                  <Input
                    value={form.number ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {tool.number || "\u2014"}
                  </p>
                )}
              </div>

              {/* Gruppe */}
              <div className="space-y-2">
                <Label>{t("group")}</Label>
                {isEditing ? (
                  <Select
                    value={form.groupId ?? ""}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, groupId: v || null }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("group")} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {tool.groupName ? (
                      <Badge
                        variant="secondary"
                        style={
                          groups.find((g) => g.id === tool.groupId)?.color
                            ? {
                                backgroundColor: `${groups.find((g) => g.id === tool.groupId)!.color}18`,
                                color: groups.find((g) => g.id === tool.groupId)!.color ?? undefined,
                                borderColor: `${groups.find((g) => g.id === tool.groupId)!.color}30`,
                              }
                            : undefined
                        }
                      >
                        {tool.groupName}
                      </Badge>
                    ) : (
                      "\u2014"
                    )}
                  </p>
                )}
              </div>

              {/* Heimstandort */}
              <div className="space-y-2">
                <Label>{t("home")}</Label>
                {isEditing ? (
                  <Select
                    value={form.homeLocationId ?? ""}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, homeLocationId: v || null }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("home")} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {tool.homeLocationName ?? "\u2014"}
                  </p>
                )}
              </div>

              <Separator className="sm:col-span-2" />

              {/* Barcode */}
              <div className="space-y-2">
                <Label>{t("barcode")}</Label>
                {isEditing ? (
                  <Input
                    value={form.barcode ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, barcode: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {tool.barcode || "\u2014"}
                  </p>
                )}
              </div>

              {/* Hersteller */}
              <div className="space-y-2">
                <Label>{t("manufacturer")}</Label>
                {isEditing ? (
                  <Input
                    value={form.manufacturer ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, manufacturer: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm">{tool.manufacturer || "\u2014"}</p>
                )}
              </div>

              {/* Herstellernummer */}
              <div className="space-y-2">
                <Label>{t("manufacturerNumber")}</Label>
                {isEditing ? (
                  <Input
                    value={form.manufacturerNumber ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        manufacturerNumber: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {tool.manufacturerNumber || "\u2014"}
                  </p>
                )}
              </div>

              {/* Seriennummer */}
              <div className="space-y-2">
                <Label>{t("serialNumber")}</Label>
                {isEditing ? (
                  <Input
                    value={form.serialNumber ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, serialNumber: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {tool.serialNumber || "\u2014"}
                  </p>
                )}
              </div>

              <Separator className="sm:col-span-2" />

              {/* Zustand */}
              <div className="space-y-2">
                <Label>{t("condition")}</Label>
                {isEditing ? (
                  <Select
                    value={form.condition ?? "good"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        condition: v as ToolCondition,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">{t("conditions.good")}</SelectItem>
                      <SelectItem value="damaged">{t("conditions.damaged")}</SelectItem>
                      <SelectItem value="repair">{t("conditions.repair")}</SelectItem>
                      <SelectItem value="decommissioned">{t("conditions.decommissioned")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {tool.condition
                      ? t(`conditions.${tool.condition}`)
                      : "\u2014"}
                  </p>
                )}
              </div>

              {/* Wartungsintervall */}
              <div className="space-y-2">
                <Label>{t("maintenanceIntervalDays")}</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min={0}
                    value={form.maintenanceIntervalDays ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maintenanceIntervalDays:
                          parseInt(e.target.value) || null,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm">
                    {tool.maintenanceIntervalDays
                      ? t("intervalDays", { count: tool.maintenanceIntervalDays })
                      : "\u2014"}
                  </p>
                )}
              </div>

              {/* Notizen */}
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("notesField")}</Label>
                {isEditing ? (
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.notes ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm">
                    {tool.notes || "\u2014"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Booking History Tab ─────────────────────────────────── */}
        <TabsContent value="bookings">
          <Card>
            {!tool.recentBookings || tool.recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">
                  {t("noBookings")}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {tool.recentBookings.map((booking) => {
                  const bookingTypeLabel: Record<string, string> = {
                    checkout: t("bookingTypes.checkout"),
                    checkin: t("bookingTypes.checkin"),
                    transfer: t("bookingTypes.transfer"),
                  }
                  const completedItems = booking.checklistResult?.filter((r) => r.checked) ?? []
                  const totalItems = booking.checklistResult?.length ?? 0

                  return (
                    <div key={booking.id} className="flex gap-4 px-6 py-4">
                      <div className="flex flex-col items-center pt-1">
                        <div className={`size-3 rounded-full ${
                          booking.checklistResult && booking.checklistResult.some((r) => r.required && !r.checked)
                            ? "bg-destructive"
                            : "bg-muted-foreground"
                        }`} />
                        <div className="mt-1 w-px flex-1 bg-border" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">
                            {bookingTypeLabel[booking.bookingType] ?? booking.bookingType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(booking.createdAt)}
                          </span>
                          {totalItems > 0 && (
                            <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                              Checkliste: {completedItems.length}/{totalItems}
                            </span>
                          )}
                        </div>
                        {booking.notes && (
                          <p className="text-xs italic text-muted-foreground">
                            {booking.notes}
                          </p>
                        )}
                        {booking.checklistResult && booking.checklistResult.length > 0 && (
                          <details className="group">
                            <summary className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline list-none">
                              <IconChecklist className="size-3" />
                              {t("showChecklist")}
                            </summary>
                            <div className="mt-2 space-y-1 rounded-md border bg-muted/40 px-3 py-2">
                              {booking.checklistResult.map((item) => (
                                <div key={item.id} className="flex items-start gap-2 text-xs">
                                  <span className={`mt-0.5 shrink-0 font-bold ${item.checked ? "text-secondary" : "text-muted-foreground"}`}>
                                    {item.checked ? "✓" : "—"}
                                  </span>
                                  <div>
                                    <span className={item.checked ? "" : "text-muted-foreground"}>
                                      {item.label}
                                    </span>
                                    {item.notes && (
                                      <p className="text-muted-foreground italic">{item.notes}</p>
                                    )}
                                  </div>
                                  {item.required && !item.checked && (
                                    <span className="ml-auto shrink-0 text-[10px] text-destructive font-medium">{t("required")}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        {/* Photos attached to this booking */}
                        <BookingPhotosInline bookingId={booking.id} entityType="tool_booking" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── Maintenance Tab ─────────────────────────────────────── */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <IconCalendar className="mb-2 size-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t("lastMaintenance")}
                </p>
                <p className="text-lg font-semibold">
                  {formatDate(tool.lastMaintenanceDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <IconCalendar
                  className={`mb-2 size-6 ${
                    maintenanceOverdue
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
                <p className="text-xs text-muted-foreground">{t("nextMaintenance")}</p>
                <p
                  className={`text-lg font-semibold ${
                    maintenanceOverdue ? "text-destructive" : ""
                  }`}
                >
                  {formatDate(tool.nextMaintenanceDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <IconTool className="mb-2 size-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("interval")}</p>
                <p className="text-lg font-semibold">
                  {tool.maintenanceIntervalDays
                    ? t("intervalDays", { count: tool.maintenanceIntervalDays })
                    : "\u2014"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                {t("maintenanceHistoryPlaceholder")}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Finanzen Tab ─────────────────────────────────── */}
        <TabsContent value="finanzen" className="space-y-4">
          {deprLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : !deprData ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16">
                <IconCurrencyEuro className="size-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Keine Finanzdaten vorhanden. Kaufpreis und Nutzungsdauer in den allgemeinen Einstellungen erfassen.
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kaufpreis</p>
                    <p className="mt-1 text-lg font-bold">
                      CHF {deprData.purchasePrice.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buchwert heute</p>
                    <p className="mt-1 text-lg font-bold text-secondary">
                      CHF {deprData.currentBookValue.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Restwert</p>
                    <p className="mt-1 text-lg font-bold text-muted-foreground">
                      CHF {deprData.salvageValue.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gesamtkosten (TCO)</p>
                    <p className="mt-1 text-lg font-bold">
                      CHF {deprData.tco.total.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* TCO Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">TCO-Aufschlüsselung</CardTitle>
                  <CardDescription>Total Cost of Ownership über {deprData.lifeYears} Jahre</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Anschaffungskosten", value: deprData.tco.purchase, colorClass: "bg-primary" },
                    { label: "Wartungskosten", value: deprData.tco.maintenance, colorClass: "bg-secondary" },
                    { label: "Versicherungskosten", value: deprData.tco.insurance, colorClass: "bg-muted-foreground" },
                  ].map(({ label, value, colorClass }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`size-3 shrink-0 rounded-full ${colorClass}`} />
                      <span className="flex-1 text-sm">{label}</span>
                      <span className="text-sm font-mono font-medium">
                        CHF {value.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Depreciation chart */}
              {deprData.schedule.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Abschreibungsverlauf</CardTitle>
                    <CardDescription>
                      {deprData.method === "declining" ? "Degressive" : "Lineare"} Abschreibung — {deprData.lifeYears} Jahre
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={deprData.schedule} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradBookValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="year"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v: number) => `J${v}`}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value) => [
                              `CHF ${Number(value).toLocaleString("de-CH", { minimumFractionDigits: 2 })}`,
                              "",
                            ]}
                            labelFormatter={(label) => `Jahr ${label}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="endValue"
                            name="Buchwert"
                            stroke="hsl(var(--chart-1))"
                            fill="url(#gradBookValue)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="depreciation"
                            name="Abschreibung"
                            stroke="hsl(var(--destructive))"
                            fill="none"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schedule table */}
              {deprData.schedule.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Abschreibungsplan</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Jahr</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Anfangswert</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Abschreibung</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Endwert</th>
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Kumuliert</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deprData.schedule.map((row) => (
                            <tr key={row.year} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-4 py-2">J{row.year}</td>
                              <td className="px-4 py-2 text-right font-mono">
                                {row.startValue.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-destructive">
                                −{row.depreciation.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-medium">
                                {row.endValue.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                                {row.accumulatedDepreciation.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── Kalibrierung Tab ─────────────────────────────── */}
        <TabsContent value="kalibrierung" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Kalibrierungshistorie</h3>
              <p className="text-xs text-muted-foreground">Alle Kalibrierungen für dieses Werkzeug</p>
            </div>
            <Button size="sm" onClick={() => setShowCalibForm((v) => !v)}>
              <IconPlus className="size-4" />
              Kalibrierung erfassen
            </Button>
          </div>

          {showCalibForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Neue Kalibrierung</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kalibriert am *</Label>
                  <Input
                    type="datetime-local"
                    value={calibForm.calibratedAt}
                    onChange={(e) => setCalibForm((f) => ({ ...f, calibratedAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nächste Kalibrierung</Label>
                  <Input
                    type="date"
                    value={calibForm.nextCalibrationDate}
                    onChange={(e) => setCalibForm((f) => ({ ...f, nextCalibrationDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ergebnis</Label>
                  <Select value={calibForm.result} onValueChange={(v) => setCalibForm((f) => ({ ...f, result: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Bestanden</SelectItem>
                      <SelectItem value="fail">Nicht bestanden</SelectItem>
                      <SelectItem value="conditional">Bedingt bestanden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zertifikat-URL</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={calibForm.certificateUrl}
                    onChange={(e) => setCalibForm((f) => ({ ...f, certificateUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("notesField")}</Label>
                  <textarea
                    className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                    value={calibForm.notes}
                    onChange={(e) => setCalibForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Bemerkungen zur Kalibrierung..."
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCalibForm(false)}
                    disabled={calibSaving}
                  >
                    {tc("cancel")}
                  </Button>
                  <Button
                    onClick={handleCalibSave}
                    disabled={calibSaving || !calibForm.calibratedAt}
                  >
                    <IconCertificate className="size-4" />
                    {calibSaving ? tc("loading") : tc("save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {calibLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : calibrations.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16">
                <IconCertificate className="size-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Noch keine Kalibrierungen erfasst.</p>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="divide-y">
                {calibrations.map((cal) => {
                  const resultColorMap: Record<string, string> = {
                    pass: "bg-secondary/10 text-secondary border-transparent",
                    fail: "bg-destructive/10 text-destructive border-transparent",
                    conditional: "bg-amber-500/10 text-amber-600 border-transparent",
                  }
                  const resultLabelMap: Record<string, string> = {
                    pass: "Bestanden",
                    fail: "Nicht bestanden",
                    conditional: "Bedingt",
                  }
                  return (
                    <div key={cal.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <IconCertificate className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {new Date(cal.calibratedAt).toLocaleDateString("de-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          {cal.result && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${resultColorMap[cal.result] ?? ""}`}
                            >
                              {resultLabelMap[cal.result] ?? cal.result}
                            </Badge>
                          )}
                          {cal.calibratedByName && (
                            <span className="text-xs text-muted-foreground">
                              von {cal.calibratedByName}
                            </span>
                          )}
                        </div>
                        {cal.nextCalibrationDate && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Nächste Kalibrierung:{" "}
                            {new Date(cal.nextCalibrationDate + "T00:00:00").toLocaleDateString("de-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        )}
                        {cal.notes && (
                          <p className="mt-1 text-xs italic text-muted-foreground">{cal.notes}</p>
                        )}
                        {cal.certificateUrl && (
                          <a
                            href={cal.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-xs text-primary hover:underline block"
                          >
                            Zertifikat anzeigen
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ─── QR-Code / Etikett Tab ────────────────────────────── */}
        <TabsContent value="qr">
          <div className="flex flex-col gap-8 py-8">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Browser-Etikett mit QR-Code und Barcode — direkt aus dem Browser drucken.
                Für Zebra-Netzwerkdrucker den ZPL-Druck verwenden.
              </p>
              <BarcodeLabel
                data={{
                  name: tool.name,
                  number: tool.number,
                  barcode: tool.barcode,
                  location: tool.homeLocationName,
                  itemId: tool.id,
                  itemType: "tool",
                }}
              />
            </div>
            <div className="border-t pt-6 flex flex-col items-center gap-3">
              <p className="text-xs text-muted-foreground font-mono text-center">
                Zebra-Netzwerkdrucker (ZPL)
              </p>
              <div className="flex flex-col items-center gap-3">
                <QrCodeDisplay
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/dashboard/tools/${tool.id}`
                      : `/dashboard/tools/${tool.id}`
                  }
                  label={`${tool.number ?? ""} · ${tool.name}`}
                  size={160}
                />
                <ZebraLabelButton
                  data={{
                    name: tool.name,
                    number: tool.number,
                    qrValue:
                      typeof window !== "undefined"
                        ? `${window.location.origin}/dashboard/tools/${tool.id}`
                        : `/dashboard/tools/${tool.id}`,
                    extra: tool.condition ?? undefined,
                  }}
                />
              </div>
            </div>
          </div>
        </TabsContent>
        {/* ─── Insurance & Warranty Tab ─────────────────────────────── */}
        <TabsContent value="insurance">
          <InsuranceWarrantyPanel entityType="tool" entityId={toolId} />
        </TabsContent>

        {/* ─── Anhänge Tab ──────────────────────────────────────────── */}
        <TabsContent value="attachments" className="pt-2">
          <AttachmentsPanel entityType="tool" entityId={toolId} />
        </TabsContent>

        {/* ─── Comments Tab ─────────────────────────────────────── */}
        <TabsContent value="comments">
          <CommentsThread entityType="tool" entityId={toolId} />
        </TabsContent>
      </Tabs>

      {/* ─── Custom Fields ─────────────────────────────────────────────── */}
      <CustomFieldsSection entityType="tool" entityId={toolId} />

      <div id="reservation-panel-anchor">{/* ─── Reservierungen ──────────────────────────────────────────── */}
      <ReservationPanel entityType="tool" entityId={toolId} />
      </div>

      {/* ─── Checkout Dialog ─────────────────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => {
        if (!open) {
          setCheckoutOpen(false)
          setCheckoutUserId("")
          setCheckoutLocationId("")
          setCheckoutNotes("")
          setCheckoutChecklist([])
          if (checkoutPhotoUrl) URL.revokeObjectURL(checkoutPhotoUrl)
          setCheckoutPhotoFile(null)
          setCheckoutPhotoUrl(null)
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("checkOut")}: {tool.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                <IconUser className="inline size-4" /> {t("assignedTo")}
              </Label>
              <Input
                value={checkoutUserId}
                onChange={(e) => setCheckoutUserId(e.target.value)}
                placeholder={t("userPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>
                <IconMapPin className="inline size-4" /> {t("targetLocation")}
              </Label>
              <Select
                value={checkoutLocationId}
                onValueChange={setCheckoutLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectLocationPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("noteOptional")}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder={t("checkoutNotePlaceholder")}
              />
            </div>

            {/* Checklist */}
            {checkoutChecklist.length > 0 && (
              <ChecklistStep
                title={t("pickupChecklist")}
                results={checkoutChecklist}
                onChange={setCheckoutChecklist}
              />
            )}

            {/* Photo */}
            <BookingPhotoButton
              previewUrl={checkoutPhotoUrl}
              onPhoto={(file, url) => {
                setCheckoutPhotoFile(file)
                setCheckoutPhotoUrl(url)
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckoutOpen(false)
                setCheckoutUserId("")
                setCheckoutLocationId("")
                setCheckoutNotes("")
                setCheckoutChecklist([])
                if (checkoutPhotoUrl) URL.revokeObjectURL(checkoutPhotoUrl)
                setCheckoutPhotoFile(null)
                setCheckoutPhotoUrl(null)
              }}
            >
              {tc("cancel")}
            </Button>
            <Button
              disabled={checkoutSubmitting || !isChecklistComplete(checkoutChecklist)}
              onClick={async () => {
                setCheckoutSubmitting(true)
                try {
                  const orgId = sessionStorage.getItem("activeOrgId") ?? ""
                  const orgHeader: Record<string, string> = orgId ? { "x-organization-id": orgId } : {}
                  const res = await fetch(`/api/tools/${toolId}/booking`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...orgHeader,
                    },
                    body: JSON.stringify({
                      bookingType: "checkout",
                      toLocationId: checkoutLocationId || undefined,
                      notes: checkoutNotes || undefined,
                      checklistResult: checkoutChecklist.length > 0 ? checkoutChecklist : undefined,
                    }),
                  })
                  if (res.status === 202) {
                    const data = await res.json()
                    setPendingApproval(data.approvalId ?? "pending")
                    setCheckoutOpen(false)
                  } else if (res.ok) {
                    const booking = await res.json()
                    // Upload photo if one was taken
                    if (checkoutPhotoFile) {
                      const fd = new FormData()
                      fd.append("entityType", "tool_booking")
                      fd.append("entityId", booking.id)
                      fd.append("file", checkoutPhotoFile)
                      await fetch("/api/attachments", { method: "POST", body: fd })
                    }
                    setCheckoutOpen(false)
                    const detailRes = await fetch(`/api/tools/${toolId}`, {
                      headers: orgHeader,
                    })
                    if (detailRes.ok) {
                      const detail = await detailRes.json()
                      setTool(detail)
                      setForm(detail)
                    }
                  }
                } catch { /* silently fail */ } finally {
                  setCheckoutSubmitting(false)
                  setCheckoutUserId("")
                  setCheckoutLocationId("")
                  setCheckoutNotes("")
                  setCheckoutChecklist([])
                  if (checkoutPhotoUrl) URL.revokeObjectURL(checkoutPhotoUrl)
                  setCheckoutPhotoFile(null)
                  setCheckoutPhotoUrl(null)
                }
              }}
            >
              <IconLogout className="size-4" />
              {checkoutSubmitting ? t("submitting") : t("checkOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Checkin Dialog ──────────────────────────────────────────── */}
      <Dialog open={checkinOpen} onOpenChange={(open) => {
        if (!open) {
          setCheckinOpen(false)
          setCheckinCondition("good")
          setCheckinNotes("")
          setCheckinChecklist([])
          if (checkinPhotoUrl) URL.revokeObjectURL(checkinPhotoUrl)
          setCheckinPhotoFile(null)
          setCheckinPhotoUrl(null)
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("checkIn")}: {tool.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">{t("currentlyAt")}</span>{" "}
                <span className="font-medium">
                  {tool.assignedUserName ?? "\u2014"}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{t("returnTo")}</span>{" "}
                <span className="font-medium">
                  {tool.homeLocationName ?? "\u2014"}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("condition")}</Label>
              <Select
                value={checkinCondition}
                onValueChange={setCheckinCondition}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">{t("conditions.good")}</SelectItem>
                  <SelectItem value="damaged">{t("conditions.damaged")}</SelectItem>
                  <SelectItem value="repair">{t("conditionRepairNeeded")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("noteOptional")}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                value={checkinNotes}
                onChange={(e) => setCheckinNotes(e.target.value)}
                placeholder={t("checkinNotePlaceholder")}
              />
            </div>

            {/* Checklist */}
            {checkinChecklist.length > 0 && (
              <ChecklistStep
                title={t("returnChecklist")}
                results={checkinChecklist}
                onChange={setCheckinChecklist}
              />
            )}

            {/* Photo */}
            <BookingPhotoButton
              previewUrl={checkinPhotoUrl}
              onPhoto={(file, url) => {
                setCheckinPhotoFile(file)
                setCheckinPhotoUrl(url)
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckinOpen(false)
                setCheckinCondition("good")
                setCheckinNotes("")
                setCheckinChecklist([])
                if (checkinPhotoUrl) URL.revokeObjectURL(checkinPhotoUrl)
                setCheckinPhotoFile(null)
                setCheckinPhotoUrl(null)
              }}
            >
              {tc("cancel")}
            </Button>
            <Button
              disabled={!isChecklistComplete(checkinChecklist)}
              onClick={async () => {
                try {
                  const orgId = sessionStorage.getItem("activeOrgId") ?? ""
                  const orgHeader: Record<string, string> = orgId ? { "x-organization-id": orgId } : {}
                  const res = await fetch(`/api/tools/${toolId}/booking`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...orgHeader,
                    },
                    body: JSON.stringify({
                      bookingType: "checkin",
                      toLocationId: tool.homeLocationId || undefined,
                      notes: checkinNotes || undefined,
                      checklistResult: checkinChecklist.length > 0 ? checkinChecklist : undefined,
                    }),
                  })
                  if (res.ok) {
                    const booking = await res.json()
                    // Upload photo if taken
                    if (checkinPhotoFile) {
                      const fd = new FormData()
                      fd.append("entityType", "tool_booking")
                      fd.append("entityId", booking.id)
                      fd.append("file", checkinPhotoFile)
                      await fetch("/api/attachments", { method: "POST", body: fd })
                    }
                    setCheckinOpen(false)
                    setCheckinCondition("good")
                    setCheckinNotes("")
                    setCheckinChecklist([])
                    if (checkinPhotoUrl) URL.revokeObjectURL(checkinPhotoUrl)
                    setCheckinPhotoFile(null)
                    setCheckinPhotoUrl(null)
                    // Refresh tool
                    const detailRes = await fetch(`/api/tools/${toolId}`, { headers: orgHeader })
                    if (detailRes.ok) {
                      const detail = await detailRes.json()
                      setTool(detail)
                      setForm(detail)
                    }
                  }
                } catch { /* silently fail */ }
              }}
            >
              <IconLogin className="size-4" />
              {t("checkIn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription", { name: tool.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
