"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconFileInvoice,
  IconDotsVertical,
  IconEye,
  IconTrash,
  IconTruck,
  IconUpload,
  IconCheck,
  IconPackage,
  IconChevronDown,
  IconChevronRight,
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
type OrderStatus = "ordered" | "partial" | "delivered" | "cancelled"

interface OrderPosition {
  id: string
  materialName: string
  materialNumber: string
  articleNumber: string
  orderedQuantity: number
  deliveredQuantity: number
  orderUnit: string
  purchasePrice: number
}

interface Order {
  id: string
  orderNumber: string
  orderDate: string
  supplierName: string
  status: OrderStatus
  deliveryNote: string | null
  hasDocument: boolean
  positions: OrderPosition[]
  total: number
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    id: "1",
    orderNumber: "BO-2025-041",
    orderDate: "2025-03-10",
    supplierName: "Hilti AG",
    status: "ordered",
    deliveryNote: null,
    hasDocument: true,
    total: 396.00,
    positions: [
      { id: "p1", materialName: "Kabelrohr 20mm grau", materialNumber: "M-001", articleNumber: "KR-20G-100", orderedQuantity: 300, deliveredQuantity: 0, orderUnit: "m", purchasePrice: 1.20 },
      { id: "p2", materialName: "Elektro-Installationsband", materialNumber: "M-007", articleNumber: "HI-EB-10", orderedQuantity: 10, deliveredQuantity: 0, orderUnit: "Rollen", purchasePrice: 2.30 },
    ],
  },
  {
    id: "2",
    orderNumber: "BO-2025-042",
    orderDate: "2025-03-08",
    supplierName: "Würth Schweiz",
    status: "partial",
    deliveryNote: "LS-2025-1241",
    hasDocument: true,
    total: 92.75,
    positions: [
      { id: "p3", materialName: "Kabelbinder 200mm", materialNumber: "M-004", articleNumber: "WU-KB200-100", orderedQuantity: 100, deliveredQuantity: 50, orderUnit: "Pck", purchasePrice: 4.90 },
      { id: "p4", materialName: "Abzweigdose UP 68mm", materialNumber: "M-008", articleNumber: "WU-AZ68-25", orderedQuantity: 25, deliveredQuantity: 25, orderUnit: "Stk", purchasePrice: 1.85 },
    ],
  },
  {
    id: "3",
    orderNumber: "BO-2025-039",
    orderDate: "2025-03-03",
    supplierName: "Bossard AG",
    status: "delivered",
    deliveryNote: "LS-2025-2882",
    hasDocument: true,
    total: 41.00,
    positions: [
      { id: "p5", materialName: "Schraubendübelset M6", materialNumber: "M-005", articleNumber: "BS-SD-M6-50", orderedQuantity: 200, deliveredQuantity: 200, orderUnit: "Stk", purchasePrice: 0.15 },
      { id: "p6", materialName: "Lüsterklemme 4mm²", materialNumber: "M-003", articleNumber: "BS-LK4-200", orderedQuantity: 100, deliveredQuantity: 100, orderUnit: "Stk", purchasePrice: 0.22 },
    ],
  },
  {
    id: "4",
    orderNumber: "BO-2025-040",
    orderDate: "2025-03-07",
    supplierName: "Debrunner Acifer",
    status: "ordered",
    deliveryNote: null,
    hasDocument: false,
    total: 76.00,
    positions: [
      { id: "p7", materialName: "Verbindungsbox IP65", materialNumber: "M-002", articleNumber: "DA-VB65-10", orderedQuantity: 20, deliveredQuantity: 0, orderUnit: "Stk", purchasePrice: 3.80 },
    ],
  },
]

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  ordered: { label: "Bestellt", color: "bg-primary/10 text-primary" },
  partial: { label: "Teil-Lieferung", color: "bg-primary/10 text-primary" },
  delivered: { label: "Geliefert", color: "bg-secondary/10 text-secondary" },
  cancelled: { label: "Storniert", color: "bg-muted text-muted-foreground" },
}

function formatCHF(val: number) {
  return `CHF ${val.toFixed(2)}`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Page ───────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const t = useTranslations("orders")
  const tc = useTranslations("common")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [loading] = useState(false)

  function toggleExpand(id: string) {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    return MOCK_ORDERS.filter((o) => {
      const matchSearch =
        !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        (o.deliveryNote ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const totalValue = useMemo(() =>
    filtered.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0), [filtered]
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("openPositions")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {MOCK_ORDERS.filter(o => o.status !== "delivered" && o.status !== "cancelled").length} offene Bestellungen · {formatCHF(MOCK_ORDERS.filter(o => o.status === "ordered" || o.status === "partial").reduce((s, o) => s + o.total, 0))}
          </p>
        </div>
      </div>

      {/* Status quick filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...Object.keys(STATUS_CONFIG)].map(s => {
          const isAll = s === "all"
          const count = isAll ? MOCK_ORDERS.length : MOCK_ORDERS.filter(o => o.status === s).length
          const label = isAll ? "Alle" : STATUS_CONFIG[s as OrderStatus].label
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer
                ${statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-border/80"}`}
            >
              {label}
              <span className={`inline-flex items-center justify-center size-4 rounded-full text-[10px] ${statusFilter === s ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={`${tc("search")}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent>
            <Empty className="py-16">
              <EmptyMedia>
                <IconFileInvoice className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Keine Bestellungen gefunden</EmptyTitle>
                <EmptyDescription>Passen Sie Ihre Filter an.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => {
            const isExpanded = expandedOrders.has(order.id)
            const statusCfg = STATUS_CONFIG[order.status]

            return (
              <Card key={order.id} className="border-0 shadow-sm overflow-hidden">
                {/* Order header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex-shrink-0">
                    {isExpanded
                      ? <IconChevronDown className="size-4 text-muted-foreground" />
                      : <IconChevronRight className="size-4 text-muted-foreground" />
                    }
                  </div>

                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.orderDate)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IconTruck className="size-3.5 text-muted-foreground/60" />
                      <span className="text-sm text-foreground">{order.supplierName}</span>
                    </div>
                    <div>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div>
                      {order.deliveryNote ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Lieferschein</p>
                          <p className="text-sm font-mono text-foreground">{order.deliveryNote}</p>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <IconUpload className="size-3" />
                          Lieferschein
                        </Button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCHF(order.total)}</p>
                      <p className="text-xs text-muted-foreground">{order.positions.length} Pos.</p>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <IconDotsVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2"><IconEye className="size-4" /> Details</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2"><IconUpload className="size-4" /> Dokument hochladen</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive"><IconTrash className="size-4" /> Stornieren</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Positions (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/50">
                          <TableHead className="text-xs font-medium text-muted-foreground pl-12">Artikel</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground w-[120px]">Bestellnr.</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground w-[130px] text-right">Bestellt</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground w-[130px] text-right">Geliefert</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground w-[110px] text-right">Preis/Stk</TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground w-[110px] text-right">Total</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.positions.map((pos) => {
                          const isDelivered = pos.deliveredQuantity >= pos.orderedQuantity
                          return (
                            <TableRow key={pos.id} className="hover:bg-muted/50 border-b border-border">
                              <TableCell className="pl-12">
                                <div className="flex items-center gap-2">
                                  <IconPackage className="size-3.5 text-muted-foreground/60" />
                                  <div>
                                    <p className="text-sm text-foreground">{pos.materialName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{pos.materialNumber}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{pos.articleNumber}</TableCell>
                              <TableCell className="text-right text-sm text-foreground">
                                {pos.orderedQuantity} {pos.orderUnit}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isDelivered
                                    ? <IconCheck className="size-3.5 text-secondary" />
                                    : null
                                  }
                                  <span className={`text-sm font-medium ${isDelivered ? "text-secondary" : pos.deliveredQuantity > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                    {pos.deliveredQuantity} {pos.orderUnit}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-foreground">
                                {formatCHF(pos.purchasePrice)}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-foreground">
                                {formatCHF(pos.purchasePrice * pos.orderedQuantity)}
                              </TableCell>
                              <TableCell>
                                {!isDelivered && (
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-secondary border-secondary/30 hover:bg-secondary/10">
                                    <IconCheck className="size-3" />
                                    Buchen
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
