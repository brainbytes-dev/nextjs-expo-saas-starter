"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { IconSearch, IconCar, IconCheck, IconBuildingFactory2 } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
interface VehicleLocation {
  id: string
  name: string
  type?: string
  metadata: {
    make?: string
    model?: string
  } | null
}

interface BookToVehicleDialogProps {
  entityType: "material" | "tool" | "key"
  entityId: string
  entityName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BookToVehicleDialog({
  entityType,
  entityId,
  entityName,
  open,
  onOpenChange,
  onSuccess,
}: BookToVehicleDialogProps) {
  const t = useTranslations("bookToVehicle")
  const tc = useTranslations("common")

  const [vehicles, setVehicles] = useState<VehicleLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)

  // Fetch vehicles on open
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSearch("")
    setSelectedVehicleId(null)
    setQuantity(1)
    fetch("/api/locations?type=vehicle,site")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.data ?? [])
        setVehicles(list.filter((v: VehicleLocation & { isActive?: boolean }) => v.isActive !== false))
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search) return vehicles
    const q = search.toLowerCase()
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.metadata?.make?.toLowerCase().includes(q) ?? false) ||
        (v.metadata?.model?.toLowerCase().includes(q) ?? false)
    )
  }, [vehicles, search])

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)

  async function handleConfirm() {
    if (!selectedVehicleId) return
    setSubmitting(true)

    try {
      let ok = false

      if (entityType === "tool") {
        const res = await fetch(`/api/tools/${entityId}/booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toLocationId: selectedVehicleId,
            bookingType: "checkout",
          }),
        })
        ok = res.ok
      } else if (entityType === "material") {
        const res = await fetch("/api/stock-changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: entityId,
            locationId: selectedVehicleId,
            quantity,
            type: "out",
          }),
        })
        ok = res.ok
      } else if (entityType === "key") {
        const vehicleName = selectedVehicle?.name ?? ""
        const make = selectedVehicle?.metadata?.make ?? ""
        const model = selectedVehicle?.metadata?.model ?? ""
        const label = [vehicleName, make, model].filter(Boolean).join(" ")
        const res = await fetch(`/api/keys/${entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: `Zugewiesen an Fahrzeug: ${label}`,
          }),
        })
        ok = res.ok
      }

      if (ok) {
        toast.success(t("success", { name: entityName, vehicle: selectedVehicle?.name ?? "" }))
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(t("error"))
      }
    } catch {
      toast.error(t("error"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: entityName })}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>

        {/* Vehicle list */}
        <div className="max-h-[280px] overflow-y-auto rounded-md border">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {tc("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <IconCar className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("noVehicles")}</p>
            </div>
          ) : (
            filtered.map((v) => {
              const isSelected = selectedVehicleId === v.id
              const subtitle = [v.metadata?.make, v.metadata?.model]
                .filter(Boolean)
                .join(" ")
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    {isSelected ? (
                      <IconCheck className="size-4 text-primary" />
                    ) : v.type === "site" ? (
                      <IconBuildingFactory2 className="size-4 text-muted-foreground" />
                    ) : (
                      <IconCar className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {v.name}
                    </p>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Quantity input for materials */}
        {entityType === "material" && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{t("quantity")}</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24"
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !selectedVehicleId}
          >
            {submitting ? tc("loading") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
