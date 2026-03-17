"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconShoppingCart,
  IconTrash,
  IconPackage,
  IconTruck,
  IconMinus,
  IconPlus,
  IconFileInvoice,
  IconAlertCircle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"

// ── Types ──────────────────────────────────────────────────────────────
interface CartItem {
  id: string
  type: "material"
  number: string
  materialName: string
  supplierName: string
  supplierId: string
  articleNumber: string
  purchasePrice: number
  orderUnit: string
  quantity: number
}

// ── Initial Cart Data ──────────────────────────────────────────────────
const INITIAL_CART: CartItem[] = [
  { id: "c1", type: "material", number: "M-002", materialName: "Verbindungsbox IP65", supplierName: "Debrunner Acifer", supplierId: "S3", articleNumber: "DA-VB65-10", purchasePrice: 3.80, orderUnit: "Stk", quantity: 20 },
  { id: "c2", type: "material", number: "M-005", materialName: "Schraubendübelset M6", supplierName: "Bossard AG", supplierId: "S4", articleNumber: "BS-SD-M6-50", purchasePrice: 0.15, orderUnit: "Stk", quantity: 200 },
  { id: "c3", type: "material", number: "M-001", materialName: "Kabelrohr 20mm grau", supplierName: "Hilti AG", supplierId: "S1", articleNumber: "KR-20G-100", purchasePrice: 1.20, orderUnit: "m", quantity: 300 },
  { id: "c4", type: "material", number: "M-008", materialName: "Abzweigdose UP 68mm", supplierName: "Würth Schweiz", supplierId: "S2", articleNumber: "WU-AZ68-25", purchasePrice: 1.85, orderUnit: "Stk", quantity: 25 },
]

function formatCHF(val: number) {
  return `CHF ${val.toFixed(2)}`
}

// ── Page ───────────────────────────────────────────────────────────────
export default function CartPage() {
  const t = useTranslations("cart")
  const tc = useTranslations("common")

  const [items, setItems] = useState<CartItem[]>(INITIAL_CART)
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [generatingOrder, setGeneratingOrder] = useState(false)

  function updateQuantity(id: string, delta: number) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ))
  }
  function setQuantity(id: string, val: string) {
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: n } : item))
    }
  }
  function removeItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }
  function clearCart() {
    setItems([])
  }

  const suppliers = useMemo(() => {
    const s = new Map<string, { id: string; name: string }>()
    items.forEach(i => s.set(i.supplierId, { id: i.supplierId, name: i.supplierName }))
    return Array.from(s.values())
  }, [items])

  const filtered = useMemo(() =>
    supplierFilter === "all" ? items : items.filter(i => i.supplierId === supplierFilter),
    [items, supplierFilter]
  )

  // Group by supplier for order summary
  const bySupplier = useMemo(() => {
    const map = new Map<string, { name: string; items: CartItem[]; total: number }>()
    items.forEach(i => {
      if (!map.has(i.supplierId)) map.set(i.supplierId, { name: i.supplierName, items: [], total: 0 })
      const g = map.get(i.supplierId)!
      g.items.push(i)
      g.total += i.purchasePrice * i.quantity
    })
    return Array.from(map.values())
  }, [items])

  const grandTotal = useMemo(() =>
    items.reduce((s, i) => s + i.purchasePrice * i.quantity, 0), [items]
  )

  async function handleGenerateOrder() {
    setGeneratingOrder(true)
    await new Promise(r => setTimeout(r, 1500))
    setGeneratingOrder(false)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">0 Artikel</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent>
            <Empty className="py-20">
              <EmptyMedia>
                <IconShoppingCart className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{t("empty")}</EmptyTitle>
                <EmptyDescription>{t("emptyDesc")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} Artikel · {bySupplier.length} Lieferanten · <span className="font-medium text-foreground">{formatCHF(grandTotal)}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={clearCart}>
          <IconTrash className="size-4" />
          {t("clearCart")}
        </Button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main table */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Filter */}
          {suppliers.length > 1 && (
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Alle Lieferanten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Lieferanten</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("materialName")}</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("supplier")}</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">{tc("details")}</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] text-right">{t("price")}</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] text-center">{t("orderQuantity")}</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] text-right">{t("total")}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/80 border-b border-border">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconPackage className="size-4 text-muted-foreground/60 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-foreground text-sm">{item.materialName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconTruck className="size-3.5 text-muted-foreground/60" />
                          <span className="text-sm text-foreground">{item.supplierName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.articleNumber}</TableCell>
                      <TableCell className="text-right text-sm text-foreground">
                        {formatCHF(item.purchasePrice)}<span className="text-muted-foreground text-xs">/{item.orderUnit}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="icon" className="size-7" onClick={() => updateQuantity(item.id, -1)}>
                            <IconMinus className="size-3" />
                          </Button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.id, e.target.value)}
                            className="w-14 text-center text-sm font-medium border border-input rounded-md h-7 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <Button variant="outline" size="icon" className="size-7" onClick={() => updateQuantity(item.id, 1)}>
                            <IconPlus className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm text-foreground">
                        {formatCHF(item.purchasePrice * item.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeItem(item.id)}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Order summary sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <IconFileInvoice className="size-4 text-muted-foreground" />
                Bestellübersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-3">
                {bySupplier.map(({ name, items: supplierItems, total }) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{supplierItems.length} Artikel</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatCHF(total)}</p>
                  </div>
                ))}
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Gesamt</p>
                  <p className="text-lg font-bold text-foreground">{formatCHF(grandTotal)}</p>
                </div>
                <div className="flex items-start gap-2 bg-primary/10 rounded-lg p-3">
                  <IconAlertCircle className="size-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-primary">{bySupplier.length} separate Bestellungen werden erzeugt (je Lieferant eine).</p>
                </div>
                <Button className="w-full gap-2" onClick={handleGenerateOrder} disabled={generatingOrder}>
                  <IconFileInvoice className="size-4" />
                  {generatingOrder ? "Wird erzeugt…" : t("generateOrder")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
