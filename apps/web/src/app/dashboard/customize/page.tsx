"use client"
"use no memo"

import { useTranslations } from "next-intl"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

import { useCallback, useEffect, useRef, useState } from "react"
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout"
import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout"
import Link from "next/link"
import {
  IconLayoutDashboard,
  IconPlus,
  IconX,
  IconCheck,
  IconRotate,
  IconArrowLeft,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { toast } from "sonner"

import {
  WIDGET_CATALOG,
  DEFAULT_LAYOUT,
  WidgetRenderer,
  type WidgetType,
} from "@/components/dashboard-widgets"

// ── Grid breakpoints ──────────────────────────────────────────────────────────
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS        = { lg: 12,   md: 10,  sm: 6,   xs: 4,   xxs: 2  }

// ── Types ─────────────────────────────────────────────────────────────────────
interface SavedWidget {
  id: string
  widgetType: WidgetType
  position: { x: number; y: number } | null
  size: { w: number; h: number } | null
}

interface WidgetItem {
  id: string          // DB id (or temp- prefix for unsaved)
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  isNew?: boolean     // not yet persisted
}

function toLayoutItems(items: WidgetItem[]): LayoutItem[] {
  return items.map((item) => ({
    i: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW ?? 2,
    minH: item.minH ?? 2,
  }))
}

function buildLayouts(items: WidgetItem[]): ResponsiveLayouts {
  const lg = toLayoutItems(items)
  const md = lg.map((l) => ({ ...l, w: Math.min(l.w, 10), x: Math.min(l.x, 8) }))
  const sm = lg.map((l) => ({ ...l, w: Math.min(l.w, 6),  x: Math.min(l.x, 4) }))
  const xs = lg.map((l) => ({ ...l, w: Math.min(l.w, 4),  x: 0                }))
  const xxs = lg.map((l) => ({ ...l, w: 2, x: 0 }))
  return { lg, md, sm, xs, xxs }
}

// ── Org header helper ─────────────────────────────────────────────────────────
function getOrgHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  try {
    const orgId = sessionStorage.getItem("orgId") ?? localStorage.getItem("orgId")
    return orgId ? { "x-organization-id": orgId } : {}
  } catch {
    return {}
  }
}

// ── Page component ────────────────────────────────────────────────────────────
export default function CustomizeDashboardPage() {
  const t = useTranslations("customize")
  const tc = useTranslations("common")
  const [items, setItems] = useState<WidgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const mounted = useRef(false)
  const { width: gridWidth, containerRef, mounted: widthMounted } = useContainerWidth()

  // ── Load existing widgets from API ──────────────────────────────────────────
  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/dashboard/widgets", { headers: getOrgHeaders() })
        if (!r.ok) throw new Error("fetch failed")
        const data = await r.json() as { data: SavedWidget[] }
        const rows = data.data ?? []

        if (rows.length === 0) {
          // No saved layout — load default
          setItems(
            DEFAULT_LAYOUT.map((d, idx) => {
              const meta = WIDGET_CATALOG.find((m) => m.type === d.type)
              return {
                id: `temp-${idx}`,
                type: d.type,
                x: d.position.x,
                y: d.position.y,
                w: d.size.w,
                h: d.size.h,
                minW: meta?.minSize.w ?? 2,
                minH: meta?.minSize.h ?? 2,
                isNew: true,
              }
            })
          )
        } else {
          if (mounted.current) setItems(
            rows.map((row) => {
              const meta = WIDGET_CATALOG.find((m) => m.type === row.widgetType)
              return {
                id: row.id,
                type: row.widgetType,
                x: row.position?.x ?? 0,
                y: row.position?.y ?? 0,
                w: row.size?.w ?? meta?.defaultSize.w ?? 4,
                h: row.size?.h ?? meta?.defaultSize.h ?? 3,
                minW: meta?.minSize.w ?? 2,
                minH: meta?.minSize.h ?? 2,
              }
            })
          )
        }
      } catch {
        // Fall back to default
        if (mounted.current) setItems(
          DEFAULT_LAYOUT.map((d, idx) => {
            const meta = WIDGET_CATALOG.find((m) => m.type === d.type)
            return {
              id: `temp-${idx}`,
              type: d.type,
              x: d.position.x,
              y: d.position.y,
              w: d.size.w,
              h: d.size.h,
              minW: meta?.minSize.w ?? 2,
              minH: meta?.minSize.h ?? 2,
              isNew: true,
            }
          })
        )
      } finally {
        if (mounted.current) setLoading(false)
      }
    }
    void run()
    return () => { mounted.current = false }
  }, [])

  // ── Add widget ──────────────────────────────────────────────────────────────
  const handleAddWidget = useCallback((type: WidgetType) => {
    const meta = WIDGET_CATALOG.find((m) => m.type === type)
    if (!meta) return
    const tempId = `temp-${Date.now()}`
    setItems((prev) => [
      ...prev,
      {
        id: tempId,
        type,
        x: 0,
        y: Infinity,
        w: meta.defaultSize.w,
        h: meta.defaultSize.h,
        minW: meta.minSize.w,
        minH: meta.minSize.h,
        isNew: true,
      },
    ])
  }, [])

  // ── Remove widget ───────────────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  // ── Layout change callback ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback((_currentLayout: LayoutItem[], allLayouts: any) => {
    const lg = allLayouts["lg"]
    if (!lg) return
    setItems((prev) =>
      prev.map((item) => {
        const l = (lg as LayoutItem[]).find((ll: LayoutItem) => ll.i === item.id)
        if (!l) return item
        return { ...item, x: l.x, y: l.y, w: l.w, h: l.h }
      })
    )
  }, [])

  // ── Save layout ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const orgHeaders = getOrgHeaders()
      const existingItems = items.filter((i) => !i.isNew)
      const newItems      = items.filter((i) => i.isNew)

      if (existingItems.length > 0) {
        const putRes = await fetch("/api/dashboard/widgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...orgHeaders },
          body: JSON.stringify({
            layouts: existingItems.map((i) => ({
              id: i.id,
              position: { x: i.x, y: i.y },
              size: { w: i.w, h: i.h },
            })),
          }),
        })
        if (!putRes.ok) throw new Error("PUT failed")
      }

      const createdIds: Record<string, string> = {}
      await Promise.all(
        newItems.map(async (item) => {
          const res = await fetch("/api/dashboard/widgets", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...orgHeaders },
            body: JSON.stringify({
              widgetType: item.type,
              position: { x: item.x, y: item.y },
              size: { w: item.w, h: item.h },
            }),
          })
          if (!res.ok) throw new Error("POST failed")
          const { data } = await res.json() as { data: { id: string } }
          createdIds[item.id] = data.id
        })
      )

      if (Object.keys(createdIds).length > 0) {
        setItems((prev) =>
          prev.map((item) =>
            createdIds[item.id]
              ? { ...item, id: createdIds[item.id]!, isNew: false }
              : item
          )
        )
      }

      toast.success(t("layoutSaved"))
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }, [items, t])

  // ── Reset to default ────────────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    setResetOpen(false)
    setSaving(true)
    try {
      const orgHeaders = getOrgHeaders()
      const existingIds = items.filter((i) => !i.isNew).map((i) => i.id)
      await Promise.all(
        existingIds.map((id) =>
          fetch(`/api/dashboard/widgets?id=${id}`, { method: "DELETE", headers: orgHeaders })
        )
      )

      setItems(
        DEFAULT_LAYOUT.map((d, idx) => {
          const meta = WIDGET_CATALOG.find((m) => m.type === d.type)
          return {
            id: `temp-${idx}`,
            type: d.type,
            x: d.position.x,
            y: d.position.y,
            w: d.size.w,
            h: d.size.h,
            minW: meta?.minSize.w ?? 2,
            minH: meta?.minSize.h ?? 2,
            isNew: true,
          }
        })
      )

      toast.success(t("layoutReset"))
    } catch {
      toast.error(t("resetError"))
    } finally {
      setSaving(false)
    }
  }, [items, t])

  // ── Grid layouts ────────────────────────────────────────────────────────────
  const layouts = buildLayouts(items)

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard" aria-label={t("backToDashboard")}>
              <IconArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <IconLayoutDashboard className="size-6 text-muted-foreground" />
              Dashboard anpassen
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Add widget */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconPlus className="size-3.5" />
                Widget hinzufügen
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[480px] overflow-y-auto">
              <DropdownMenuLabel>{t("availableWidgets")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {WIDGET_CATALOG.map((meta) => (
                <DropdownMenuItem
                  key={meta.type}
                  onClick={() => handleAddWidget(meta.type)}
                  className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                >
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{meta.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset to default */}
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={saving}>
                <IconRotate className="size-3.5" />
                Standard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconAlertTriangle className="size-5 text-amber-500" />
                  Auf Standard zurücksetzen?
                </DialogTitle>
                <DialogDescription>
                  {t("resetDescription")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{tc("cancel")}</Button>
                </DialogClose>
                <Button variant="destructive" onClick={() => void handleReset()}>
                  Zurücksetzen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save */}
          <Button size="sm" className="gap-1.5" onClick={() => void handleSave()} disabled={saving}>
            {saving
              ? <IconLoader2 className="size-3.5 animate-spin" />
              : <IconCheck className="size-3.5" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* ── Hint bar ─────────────────────────────────────────────────── */}
      <div className="mx-4 lg:mx-6 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        {t("hintText")}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6" ref={containerRef}>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground gap-2">
            <IconLoader2 className="size-4 animate-spin" />
            {t("layoutLoading")}
          </div>
        ) : (
          <ResponsiveGridLayout
            width={widthMounted ? gridWidth : 1280}
            layouts={layouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={80}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            onLayoutChange={handleLayoutChange as Parameters<typeof ResponsiveGridLayout>[0]["onLayoutChange"]}
            dragConfig={{ handle: ".widget-drag-handle" }}
            resizeConfig={{ enabled: true }}
          >
            {items.map((item) => (
              <div key={item.id} className="group relative rounded-xl border bg-card shadow-sm">
                {/* Drag handle overlay at the top */}
                <div className="widget-drag-handle absolute inset-x-0 top-0 h-8 z-10 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/40 transition-colors rounded-t-xl" />

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute right-2 top-2 z-20 flex size-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  aria-label={t("removeWidget")}
                >
                  <IconX className="size-3.5" />
                </button>

                {/* Widget content */}
                <div className="h-full w-full overflow-hidden rounded-xl pt-6">
                  <WidgetRenderer type={item.type} />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  )
}
