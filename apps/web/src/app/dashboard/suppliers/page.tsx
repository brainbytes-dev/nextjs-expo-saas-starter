"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconPlus,
  IconSearch,
  IconTruck,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconShoppingCart,
  IconPackage,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ──────────────────────────────────────────────────────────────
interface SourceItem {
  id: string
  materialName: string
  materialNumber: string
  supplierName: string
  supplierId: string
  articleNumber: string
  purchasePrice: number | null
  priceDate: string | null
  quantityPerOrder: number
  orderUnit: string
  inCart: boolean
}

type SupplierSortKey = "materialName" | "supplierName" | "articleNumber" | "purchasePrice"

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_SOURCES: SourceItem[] = [
  { id: "1", materialName: "Kabelrohr 20mm grau", materialNumber: "M-001", supplierName: "Hilti AG", supplierId: "S1", articleNumber: "KR-20G-100", purchasePrice: 1.20, priceDate: "2025-01-15", quantityPerOrder: 100, orderUnit: "m", inCart: false },
  { id: "2", materialName: "Kabelrohr 20mm grau", materialNumber: "M-001", supplierName: "Würth Schweiz", supplierId: "S2", articleNumber: "WU-KR20-50", purchasePrice: 1.45, priceDate: "2025-02-01", quantityPerOrder: 50, orderUnit: "m", inCart: false },
  { id: "3", materialName: "Verbindungsbox IP65", materialNumber: "M-002", supplierName: "Debrunner Acifer", supplierId: "S3", articleNumber: "DA-VB65-10", purchasePrice: 3.80, priceDate: "2025-01-20", quantityPerOrder: 10, orderUnit: "Stk", inCart: true },
  { id: "4", materialName: "Lüsterklemme 4mm²", materialNumber: "M-003", supplierName: "Hilti AG", supplierId: "S1", articleNumber: "LK-4-100", purchasePrice: 0.28, priceDate: "2025-03-01", quantityPerOrder: 100, orderUnit: "Stk", inCart: false },
  { id: "5", materialName: "Lüsterklemme 4mm²", materialNumber: "M-003", supplierName: "Bossard AG", supplierId: "S4", articleNumber: "BS-LK4-200", purchasePrice: 0.22, priceDate: "2025-02-15", quantityPerOrder: 200, orderUnit: "Stk", inCart: false },
  { id: "6", materialName: "Kabelbinder 200mm", materialNumber: "M-004", supplierName: "Würth Schweiz", supplierId: "S2", articleNumber: "WU-KB200-100", purchasePrice: 4.90, priceDate: "2025-01-10", quantityPerOrder: 100, orderUnit: "Pck", inCart: false },
  { id: "7", materialName: "Schraubendübelset M6", materialNumber: "M-005", supplierName: "Bossard AG", supplierId: "S4", articleNumber: "BS-SD-M6-50", purchasePrice: 0.15, priceDate: "2025-02-20", quantityPerOrder: 50, orderUnit: "Stk", inCart: true },
  { id: "8", materialName: "Silikon transparent 310ml", materialNumber: "M-006", supplierName: "Haberkorn AG", supplierId: "S5", articleNumber: "HA-SI310T", purchasePrice: 5.60, priceDate: "2025-03-05", quantityPerOrder: 12, orderUnit: "Stk", inCart: false },
  { id: "9", materialName: "Elektro-Installationsband", materialNumber: "M-007", supplierName: "Hilti AG", supplierId: "S1", articleNumber: "HI-EB-10", purchasePrice: 2.30, priceDate: "2025-01-25", quantityPerOrder: 10, orderUnit: "Rollen", inCart: false },
]

const SUPPLIERS = ["Alle Lieferanten", "Hilti AG", "Würth Schweiz", "Debrunner Acifer", "Bossard AG", "Haberkorn AG"]

function formatCHF(val: number | null) {
  if (val === null) return "—"
  return `CHF ${val.toFixed(2)}`
}
function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── CSV helper ─────────────────────────────────────────────────────────
function downloadCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const lines = [
    headers.join(";"),
    ...rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function cmpStr(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a.toLowerCase().localeCompare(b.toLowerCase(), "de")
}

// ── Sort Icon ──────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <IconSelector className="ml-1 size-3.5 text-muted-foreground/50" />
  return dir === "asc"
    ? <IconChevronUp className="ml-1 size-3.5" />
    : <IconChevronDown className="ml-1 size-3.5" />
}

function SupplierSortableHead({ label, sk, className, onSort, sortKey, sortDir }: { label: string; sk: SupplierSortKey; className?: string; onSort: (key: SupplierSortKey) => void; sortKey: SupplierSortKey | null; sortDir: "asc" | "desc" }) {
  return (
    <TableHead
      className={`text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none ${className ?? ""}`}
      onClick={() => onSort(sk)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon active={sortKey === sk} dir={sortDir} />
      </span>
    </TableHead>
  )
}

// ── Page ───────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const t = useTranslations("suppliers")
  const tc = useTranslations("common")

  const [search, setSearch] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("Alle Lieferanten")
  const [cartItems, setCartItems] = useState<Set<string>>(new Set(MOCK_SOURCES.filter(s => s.inCart).map(s => s.id)))
  const [loading] = useState(false)
  const [sortKey, setSortKey] = useState<SupplierSortKey | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  function handleSort(key: SupplierSortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    return MOCK_SOURCES.filter((s) => {
      const matchSearch =
        !search ||
        s.materialName.toLowerCase().includes(search.toLowerCase()) ||
        s.articleNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.materialNumber.toLowerCase().includes(search.toLowerCase())
      const matchSupplier = supplierFilter === "Alle Lieferanten" || s.supplierName === supplierFilter
      return matchSearch && matchSupplier
    })
  }, [search, supplierFilter])

  // When a sort is active, sort the flat list first, then group; otherwise group directly
  const grouped = useMemo(() => {
    if (sortKey) {
      // Sort flat, then re-group preserving sorted order
      const sorted = [...filtered].sort((a, b) => {
        let result = 0
        switch (sortKey) {
          case "materialName":
            result = cmpStr(a.materialName, b.materialName)
            break
          case "supplierName":
            result = cmpStr(a.supplierName, b.supplierName)
            break
          case "articleNumber":
            result = cmpStr(a.articleNumber, b.articleNumber)
            break
          case "purchasePrice":
            result = (a.purchasePrice ?? -Infinity) - (b.purchasePrice ?? -Infinity)
            break
        }
        return sortDir === "asc" ? result : -result
      })
      // Re-group preserving order of first appearance
      const map = new Map<string, { materialName: string; materialNumber: string; sources: SourceItem[] }>()
      sorted.forEach(s => {
        if (!map.has(s.materialNumber)) {
          map.set(s.materialNumber, { materialName: s.materialName, materialNumber: s.materialNumber, sources: [] })
        }
        map.get(s.materialNumber)!.sources.push(s)
      })
      return Array.from(map.values())
    }

    // Default: group by material in original order
    const map = new Map<string, { materialName: string; materialNumber: string; sources: SourceItem[] }>()
    filtered.forEach(s => {
      if (!map.has(s.materialNumber)) {
        map.set(s.materialNumber, { materialName: s.materialName, materialNumber: s.materialNumber, sources: [] })
      }
      map.get(s.materialNumber)!.sources.push(s)
    })
    return Array.from(map.values())
  }, [filtered, sortKey, sortDir])

  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set())

  function toggleExpand(materialNumber: string) {
    setExpandedMaterials(prev => {
      const next = new Set(prev)
      if (next.has(materialNumber)) next.delete(materialNumber)
      else next.add(materialNumber)
      return next
    })
  }

  function toggleCart(id: string) {
    setCartItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleExportCsv() {
    const headers = ["Material", "Materialnummer", "Lieferant", "Artikelnummer", "Einkaufspreis (CHF)", "Bestellmenge", "Bestelleinheit"]
    const rows = filtered.map(s => [
      s.materialName,
      s.materialNumber,
      s.supplierName,
      s.articleNumber,
      s.purchasePrice != null ? s.purchasePrice.toFixed(2) : null,
      s.quantityPerOrder,
      s.orderUnit,
    ])
    downloadCsv(headers, rows, "lieferanten.csv")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {MOCK_SOURCES.length} Bezugsquellen · {cartItems.size} im Warenkorb
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleExportCsv} title="CSV exportieren">
            <IconDownload className="size-4" />
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href="/dashboard/cart">
              <IconShoppingCart className="size-4" />
              Warenkorb ({cartItems.size})
            </a>
          </Button>
          <Button className="gap-2">
            <IconPlus className="size-4" />
            {t("addSource")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={`${tc("search")}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("filterBySupplier")} />
          </SelectTrigger>
          <SelectContent>
            {SUPPLIERS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : grouped.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconTruck className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Keine Bezugsquellen gefunden</EmptyTitle>
                <EmptyDescription>
                  {search ? "Passen Sie Ihre Suche an." : "Fügen Sie Ihre erste Bezugsquelle hinzu."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[32px]" />
                  <SupplierSortableHead label={t("materialName")} sk="materialName" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                  <SupplierSortableHead label={t("supplier")} sk="supplierName" className="w-[120px]" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                  <SupplierSortableHead label={t("articleNumber")} sk="articleNumber" className="w-[140px]" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                  <SupplierSortableHead label={t("purchasePrice")} sk="purchasePrice" className="w-[120px] text-right" onSort={handleSort} sortKey={sortKey} sortDir={sortDir} />
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">{t("priceDate")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-right">{t("quantityPerOrder")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">{t("orderUnit")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map(({ materialName, materialNumber, sources }) => {
                  const isExpanded = expandedMaterials.has(materialNumber)
                  const hasMultiple = sources.length > 1

                  return sources.map((source, idx) => {
                    const isFirst = idx === 0
                    if (!isFirst && !isExpanded) return null

                    const inCart = cartItems.has(source.id)

                    return (
                      <TableRow
                        key={source.id}
                        className={`group border-b border-border hover:bg-muted/80 ${!isFirst ? "bg-muted/30" : ""}`}
                      >
                        <TableCell className="w-[32px]">
                          {isFirst && hasMultiple && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground"
                              onClick={() => toggleExpand(materialNumber)}
                            >
                              {isExpanded
                                ? <IconChevronDown className="size-3.5" />
                                : <IconChevronRight className="size-3.5" />
                              }
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {isFirst ? (
                            <div className="flex items-center gap-2">
                              <IconPackage className="size-4 text-muted-foreground/60 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-foreground">{materialName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{materialNumber}</p>
                              </div>
                              {hasMultiple && (
                                <Badge variant="secondary" className="text-xs ml-1">{sources.length} Quellen</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="pl-6 text-sm text-muted-foreground">↳ Alternativ</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <IconTruck className="size-3.5 text-muted-foreground/60" />
                            <span className="text-sm text-foreground">{source.supplierName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{source.articleNumber}</TableCell>
                        <TableCell className="text-right font-medium text-sm text-foreground">{formatCHF(source.purchasePrice)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(source.priceDate)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-foreground">{source.quantityPerOrder}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{source.orderUnit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant={inCart ? "default" : "outline"}
                              size="sm"
                              className={`text-xs h-7 gap-1.5 ${inCart ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"}`}
                              onClick={() => toggleCart(source.id)}
                            >
                              <IconShoppingCart className="size-3" />
                              {inCart ? "Im Warenkorb" : "Bestellen"}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <IconDotsVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2"><IconEdit className="size-4" /> {tc("edit")}</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive"><IconTrash className="size-4" /> {tc("delete")}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
