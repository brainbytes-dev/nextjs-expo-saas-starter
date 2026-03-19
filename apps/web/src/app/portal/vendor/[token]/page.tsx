"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { IconPackage, IconTruck, IconCheck, IconClock, IconX, IconChevronDown, IconChevronRight, IconMessageCircle, IconLoader2, IconAlertTriangle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

interface OrderItem { id: string; materialName: string; materialNumber: string | null; quantity: number; receivedQuantity: number | null; unitPrice: number | null; currency: string | null }
interface Order { id: string; orderNumber: string | null; ownOrderNumber: string | null; status: string | null; orderDate: string | null; totalAmount: number | null; currency: string | null; notes: string | null; items: OrderItem[] }
interface PortalData { supplier: { name: string }; org: { name: string; logo: string | null; primaryColor: string | null }; orders: Order[] }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Entwurf", color: "bg-muted text-muted-foreground", icon: IconClock },
  ordered: { label: "Bestellt", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: IconTruck },
  partial: { label: "Teillieferung", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300", icon: IconPackage },
  received: { label: "Geliefert", color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300", icon: IconCheck },
  cancelled: { label: "Storniert", color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", icon: IconX },
}

function formatCHF(val: number | null, currency?: string | null) { if (val === null) return "—"; return `${currency || "CHF"} ${(val / 100).toFixed(2)}` }
function formatDate(iso: string | null) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }) }

export default function VendorPortalPage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/vendor/${params.token}`)
      if (!res.ok) { const err = await res.json(); setError(err.error || "Zugriff verweigert"); return }
      setData(await res.json())
    } catch { setError("Netzwerkfehler") } finally { setLoading(false) }
  }, [params.token])

  useEffect(() => { void fetchData() }, [fetchData])

  function toggleExpand(id: string) { setExpandedOrders((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }

  async function handleConfirm(orderId: string) {
    setSaving(orderId)
    try { await fetch(`/api/portal/vendor/${params.token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: "confirmed", notes: notesDraft[orderId] }) }); await fetchData() } catch { /* silent */ } finally { setSaving(null) }
  }

  async function handleSaveNotes(orderId: string) {
    setSaving(orderId)
    try { await fetch(`/api/portal/vendor/${params.token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, notes: notesDraft[orderId] }) }); await fetchData() } catch { /* silent */ } finally { setSaving(null) }
  }

  if (error) return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md w-full"><CardContent className="flex flex-col items-center gap-4 py-12">
        <IconAlertTriangle className="size-12 text-destructive/60" />
        <h1 className="text-xl font-semibold text-foreground">Zugriff verweigert</h1>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
      </CardContent></Card>
    </div>
  )

  if (loading || !data) return (
    <div className="max-w-5xl mx-auto p-6 space-y-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
  )

  const primaryColor = data.org.primaryColor || "#2563eb"
  const openOrders = data.orders.filter((o) => o.status !== "received" && o.status !== "cancelled")

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4 py-4 border-b border-border">
        {data.org.logo ? (
          <Image src={data.org.logo} alt={data.org.name} width={40} height={40} className="h-10 w-10 rounded-lg object-contain" unoptimized />
        ) : (
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: primaryColor }}>{data.org.name.charAt(0)}</div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{data.org.name}</h1>
          <p className="text-sm text-muted-foreground">Lieferanten-Portal &mdash; {data.supplier.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Offene Bestellungen</p><p className="text-2xl font-bold text-foreground mt-1">{openOrders.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Alle Bestellungen</p><p className="text-2xl font-bold text-foreground mt-1">{data.orders.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bestellt</p><p className="text-2xl font-bold text-foreground mt-1">{data.orders.filter((o) => o.status === "ordered").length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Geliefert</p><p className="text-2xl font-bold text-foreground mt-1">{data.orders.filter((o) => o.status === "received").length}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Bestellungen</h2>
        {data.orders.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><IconPackage className="size-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground">Keine Bestellungen vorhanden.</p></CardContent></Card>
        ) : data.orders.map((order) => {
          const isExpanded = expandedOrders.has(order.id)
          const cfg = STATUS_CONFIG[order.status || "draft"] || STATUS_CONFIG.draft
          const StatusIcon = cfg.icon
          return (
            <Card key={order.id} className="border-0 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleExpand(order.id)}>
                <div className="flex-shrink-0">{isExpanded ? <IconChevronDown className="size-4 text-muted-foreground" /> : <IconChevronRight className="size-4 text-muted-foreground" />}</div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
                  <div><p className="text-sm font-semibold text-foreground">{order.orderNumber || order.ownOrderNumber || "—"}</p><p className="text-xs text-muted-foreground">{formatDate(order.orderDate)}</p></div>
                  <div><span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${cfg.color}`}><StatusIcon className="size-3" />{cfg.label}</span></div>
                  <div className="text-sm text-foreground">{order.items.length} Position{order.items.length !== 1 ? "en" : ""}</div>
                  <div className="text-right text-sm font-semibold text-foreground">{order.totalAmount !== null ? formatCHF(order.totalAmount, order.currency) : "—"}</div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="text-xs pl-10">Artikel</TableHead>
                      <TableHead className="text-xs w-[100px] text-right">Bestellt</TableHead>
                      <TableHead className="text-xs w-[100px] text-right">Geliefert</TableHead>
                      <TableHead className="text-xs w-[110px] text-right">Preis</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="pl-10"><p className="text-sm text-foreground">{item.materialName}</p>{item.materialNumber && <p className="text-xs text-muted-foreground font-mono">{item.materialNumber}</p>}</TableCell>
                          <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right"><span className={`text-sm font-medium ${(item.receivedQuantity ?? 0) >= item.quantity ? "text-green-600" : (item.receivedQuantity ?? 0) > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{item.receivedQuantity ?? 0}</span></TableCell>
                          <TableCell className="text-right text-sm">{item.unitPrice !== null ? formatCHF(item.unitPrice, item.currency) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-muted/20 space-y-3">
                    {order.notes && <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Notizen:</span> {order.notes}</div>}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Textarea placeholder="Notiz hinzufügen (Liefertermin, Bemerkungen...)" value={notesDraft[order.id] ?? ""} onChange={(e) => setNotesDraft((prev) => ({ ...prev, [order.id]: e.target.value }))} className="flex-1 min-h-[60px] bg-background" />
                      <div className="flex gap-2 sm:flex-col">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSaveNotes(order.id)} disabled={saving === order.id || !notesDraft[order.id]}>
                          {saving === order.id ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconMessageCircle className="size-3.5" />}Notiz speichern
                        </Button>
                        {order.status === "draft" && (
                          <Button size="sm" className="gap-1.5" style={{ backgroundColor: primaryColor }} onClick={() => handleConfirm(order.id)} disabled={saving === order.id}>
                            {saving === order.id ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconCheck className="size-3.5" />}Bestellung bestätigen
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="text-center py-6 border-t border-border">
        <p className="text-xs text-muted-foreground">Bereitgestellt von <span className="font-semibold">Logistik<span style={{ color: primaryColor }}>App</span></span></p>
      </div>
    </div>
  )
}
