"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconTruck,
  IconStar,
  IconLoader2,
  IconPlus,
  IconCalendar,
  IconUser,
  IconBuildingStore,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StarRating, StarDisplay } from "@/components/star-rating"
import { Progress } from "@/components/ui/progress"

// ── Types ──────────────────────────────────────────────────────────────────────
interface SupplierDetail {
  id: string
  name: string
  supplierNumber: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  notes: string | null
}

interface Rating {
  id: string
  quality: number | null
  priceAccuracy: number | null
  communication: number | null
  deliveryTime: number | null
  notes: string | null
  createdAt: string
  ratedByName: string | null
  ratedByEmail: string | null
  orderNumber: string | null
}

interface Averages {
  overall: number | null
  quality: number | null
  priceAccuracy: number | null
  communication: number | null
  deliveryTime: number | null
}

interface RatingsData {
  supplier: { id: string; name: string }
  ratings: Rating[]
  averages: Averages
  count: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function ScoreBar({
  label,
  value,
  max = 5,
}: {
  label: string
  value: number | null
  max?: number
}) {
  const pct = value != null ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex flex-1 items-center gap-3">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
          {value != null ? value.toFixed(1) : "—"}
        </span>
      </div>
    </div>
  )
}

// ── Rating Form Dialog ─────────────────────────────────────────────────────────
function AddRatingDialog({
  supplierId,
  onAdded,
}: {
  supplierId: string
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    quality: 0,
    priceAccuracy: 0,
    communication: 0,
    deliveryTime: "",
    notes: "",
  })

  function reset() {
    setForm({ quality: 0, priceAccuracy: 0, communication: 0, deliveryTime: "", notes: "" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quality: form.quality || null,
          priceAccuracy: form.priceAccuracy || null,
          communication: form.communication || null,
          deliveryTime: form.deliveryTime ? parseInt(form.deliveryTime, 10) : null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error("Fehler")
      onAdded()
      setOpen(false)
      reset()
    } catch {
      // keep form open
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <IconPlus className="size-4" />
          Bewertung abgeben
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("supplierRating")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Quality */}
            <div className="flex items-center justify-between gap-4">
              <Label className="w-36 shrink-0 text-sm">{t("quality")}</Label>
              <StarRating
                value={form.quality || null}
                onChange={(v) => setForm((p) => ({ ...p, quality: v }))}
                size="lg"
              />
            </div>
            {/* Price Accuracy */}
            <div className="flex items-center justify-between gap-4">
              <Label className="w-36 shrink-0 text-sm">{t("priceAccuracy")}</Label>
              <StarRating
                value={form.priceAccuracy || null}
                onChange={(v) => setForm((p) => ({ ...p, priceAccuracy: v }))}
                size="lg"
              />
            </div>
            {/* Communication */}
            <div className="flex items-center justify-between gap-4">
              <Label className="w-36 shrink-0 text-sm">{t("communication")}</Label>
              <StarRating
                value={form.communication || null}
                onChange={(v) => setForm((p) => ({ ...p, communication: v }))}
                size="lg"
              />
            </div>
            {/* Delivery time */}
            <div className="grid gap-2">
              <Label htmlFor="delivery-time">{t("deliveryTimeDays")}</Label>
              <Input
                id="delivery-time"
                type="number"
                min="1"
                placeholder="z.B. 5"
                value={form.deliveryTime}
                onChange={(e) => setForm((p) => ({ ...p, deliveryTime: e.target.value }))}
              />
            </div>
            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="rating-notes">{t("commentOptional")}</Label>
              <Textarea
                id="rating-notes"
                placeholder={t("commentPlaceholder")}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (form.quality === 0 &&
                  form.priceAccuracy === 0 &&
                  form.communication === 0)
              }
            >
              {loading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Bewertung Tab ──────────────────────────────────────────────────────────────
function BewertungTab({ supplierId }: { supplierId: string }) {
  const [data, setData] = useState<RatingsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRatings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/ratings`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    void fetchRatings()
  }, [fetchRatings])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const avgs = data?.averages
  const ratings = data?.ratings ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data?.count ?? 0} Bewertung{data?.count !== 1 ? "en" : ""}
          </p>
        </div>
        <AddRatingDialog supplierId={supplierId} onAdded={fetchRatings} />
      </div>

      {/* Averages card */}
      {avgs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("avgRating")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Overall */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm font-medium">{t("overall")}</span>
              <div className="flex items-center gap-2">
                <StarDisplay value={avgs.overall} size="md" />
                <span className="text-lg font-bold tabular-nums">
                  {avgs.overall != null ? avgs.overall.toFixed(1) : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <ScoreBar label={t("quality")} value={avgs.quality} />
              <ScoreBar label={t("priceAccuracy")} value={avgs.priceAccuracy} />
              <ScoreBar label={t("communication")} value={avgs.communication} />
              {avgs.deliveryTime != null && (
                <div className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-muted-foreground">
                    {t("deliveryTime")}
                  </span>
                  <span className="text-sm font-medium">
                    Ø {avgs.deliveryTime.toFixed(1)} Tage
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual ratings */}
      {ratings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <IconStar className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">{t("noRatings")}</p>
          <p className="text-xs text-muted-foreground">
            {t("noRatingsDesc")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t("ratingHistory")}</h3>
          {ratings.map((r) => (
            <Card key={r.id} className="border border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Stars row */}
                    <div className="flex flex-wrap gap-4">
                      {r.quality != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground w-24">{t("quality")}</span>
                          <StarDisplay value={r.quality} size="sm" />
                        </div>
                      )}
                      {r.priceAccuracy != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground w-24">{t("price")}</span>
                          <StarDisplay value={r.priceAccuracy} size="sm" />
                        </div>
                      )}
                      {r.communication != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground w-24">{t("communication")}</span>
                          <StarDisplay value={r.communication} size="sm" />
                        </div>
                      )}
                    </div>
                    {r.deliveryTime != null && (
                      <p className="text-xs text-muted-foreground">
                        Lieferzeit: {r.deliveryTime} Tage
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-sm text-foreground leading-relaxed">{r.notes}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      <IconCalendar className="size-3" />
                      {formatDate(r.createdAt)}
                    </div>
                    {(r.ratedByName ?? r.ratedByEmail) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <IconUser className="size-3" />
                        {r.ratedByName ?? r.ratedByEmail}
                      </div>
                    )}
                    {r.orderNumber && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <IconBuildingStore className="size-3" />
                        {r.orderNumber}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations("supplierDetail")
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSupplier() {
      try {
        const res = await fetch(`/api/suppliers/${id}`)
        if (res.ok) {
          setSupplier(await res.json())
        } else if (res.status === 404) {
          router.push("/dashboard/master/suppliers")
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    void fetchSupplier()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!supplier) return null

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/master/suppliers")}
          className="size-8"
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <IconTruck className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{supplier.name}</h1>
            {supplier.supplierNumber && (
              <p className="text-sm text-muted-foreground">
                Nr. {supplier.supplierNumber}
              </p>
            )}
          </div>
        </div>
        {supplier.city && (
          <Badge variant="secondary" className="ml-auto shrink-0">
            {supplier.city}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="bewertung">
        <TabsList>
          <TabsTrigger value="details">{t("details")}</TabsTrigger>
          <TabsTrigger value="bewertung">{t("rating")}</TabsTrigger>
        </TabsList>

        {/* ── Details Tab ─────────────────────────────────────────── */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              {[
                { label: t("contactPerson"), value: supplier.contactPerson },
                { label: t("email"), value: supplier.email },
                { label: t("phone"), value: supplier.phone },
                { label: t("address"), value: supplier.address },
                { label: t("city"), value: supplier.city },
                { label: t("country"), value: supplier.country },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-sm font-medium">{value ?? "—"}</p>
                </div>
              ))}
              {supplier.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t("notes")}</p>
                  <p className="mt-0.5 text-sm">{supplier.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bewertung Tab ────────────────────────────────────────── */}
        <TabsContent value="bewertung" className="mt-4">
          <BewertungTab supplierId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
