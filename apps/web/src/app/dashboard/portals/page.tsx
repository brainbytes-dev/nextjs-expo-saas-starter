"use client"

import { useState, useEffect, useCallback } from "react"
import { IconPlus, IconCopy, IconTrash, IconTruck, IconUsers, IconExternalLink, IconCheck, IconSearch, IconLink, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

interface PortalToken { id: string; token: string; email: string; isActive: boolean; lastAccessedAt: string | null; expiresAt: string | null; createdAt: string; supplierId?: string; supplierName?: string; customerId?: string; customerName?: string }
interface SelectOption { id: string; name: string; email: string | null }

function formatDate(iso: string | null) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
function isExpired(token: PortalToken): boolean { if (!token.expiresAt) return false; return new Date(token.expiresAt) < new Date() }
function getStatus(token: PortalToken): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!token.isActive) return { label: "Widerrufen", variant: "destructive" }
  if (isExpired(token)) return { label: "Abgelaufen", variant: "outline" }
  return { label: "Aktiv", variant: "default" }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy} title="Link kopieren">{copied ? <IconCheck className="size-3.5 text-green-600" /> : <IconCopy className="size-3.5" />}</Button>
}

function TokenTable({ tokens, loading, type, onRevoke }: { tokens: PortalToken[]; loading: boolean; type: "vendor" | "customer"; onRevoke: (id: string) => void }) {
  const [search, setSearch] = useState("")
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const filtered = tokens.filter((t) => { const name = type === "vendor" ? t.supplierName : t.customerName; return !search || (name ?? "").toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()) })

  if (loading) return <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  if (tokens.length === 0) return <div className="py-12 text-center"><IconLink className="size-10 text-muted-foreground/40 mx-auto mb-3" /><h3 className="text-base font-semibold text-foreground mb-1">Keine Portal-Einladungen</h3><p className="text-sm text-muted-foreground">Erstellen Sie Ihre erste Einladung, um externen Zugriff zu gewähren.</p></div>

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm px-4 pt-2"><IconSearch className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead className="text-xs font-medium">{type === "vendor" ? "Lieferant" : "Kunde"}</TableHead>
          <TableHead className="text-xs font-medium">E-Mail</TableHead>
          <TableHead className="text-xs font-medium w-[100px]">Status</TableHead>
          <TableHead className="text-xs font-medium w-[140px]">Letzter Zugriff</TableHead>
          <TableHead className="text-xs font-medium w-[140px]">Ablaufdatum</TableHead>
          <TableHead className="w-[120px]" />
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((token) => {
            const status = getStatus(token); const portalUrl = `${baseUrl}/portal/${type}/${token.token}`
            return (
              <TableRow key={token.id} className="group">
                <TableCell className="font-medium">{type === "vendor" ? token.supplierName : token.customerName}</TableCell>
                <TableCell className="text-muted-foreground">{token.email}</TableCell>
                <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(token.lastAccessedAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{token.expiresAt ? formatDate(token.expiresAt) : "Unbegrenzt"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={portalUrl} />
                    <Button variant="ghost" size="icon" className="size-7" asChild><a href={portalUrl} target="_blank" rel="noopener noreferrer" title="Portal öffnen"><IconExternalLink className="size-3.5" /></a></Button>
                    {token.isActive && <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => onRevoke(token.id)} title="Widerrufen"><IconTrash className="size-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function CreateTokenDialog({ open, onOpenChange, type, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; type: "vendor" | "customer"; onCreated: () => void }) {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [email, setEmail] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("90")
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const endpoint = type === "vendor" ? "/api/suppliers" : "/api/customers"
    fetch(`${endpoint}?limit=100`).then((r) => r.json()).then((data) => { const items = data.data || data; if (Array.isArray(items)) setOptions(items.map((item: Record<string, string>) => ({ id: item.id, name: item.name, email: item.email }))) }).catch(() => {}).finally(() => setLoading(false))
  }, [open, type])

  useEffect(() => { if (selectedId) { const opt = options.find((o) => o.id === selectedId); if (opt?.email) setEmail(opt.email) } }, [selectedId, options])

  async function handleCreate() {
    setCreating(true)
    try {
      const body: Record<string, string | number> = { email, ...(type === "vendor" ? { supplierId: selectedId } : { customerId: selectedId }) }
      if (expiresInDays !== "never") body.expiresInDays = parseInt(expiresInDays)
      const res = await fetch(`/api/portal-tokens/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) { onCreated(); onOpenChange(false); setSelectedId(""); setEmail("") }
    } catch { /* silent */ } finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{type === "vendor" ? "Lieferanten-Portal" : "Kunden-Portal"} einladen</DialogTitle>
          <DialogDescription>Erstellen Sie einen Portal-Zugang für {type === "vendor" ? "einen Lieferanten" : "einen Kunden"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{type === "vendor" ? "Lieferant" : "Kunde"}</Label>
            {loading ? <Skeleton className="h-10 w-full" /> : (
              <Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>{options.map((opt) => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}</SelectContent></Select>
            )}
          </div>
          <div className="space-y-2"><Label>E-Mail-Adresse</Label><Input type="email" placeholder="kontakt@beispiel.ch" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Gültigkeit</Label>
            <Select value={expiresInDays} onValueChange={setExpiresInDays}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="30">30 Tage</SelectItem><SelectItem value="90">90 Tage</SelectItem><SelectItem value="180">180 Tage</SelectItem><SelectItem value="365">1 Jahr</SelectItem><SelectItem value="never">Unbegrenzt</SelectItem></SelectContent></Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleCreate} disabled={!selectedId || !email || creating} className="gap-1.5">{creating ? <IconLoader2 className="size-4 animate-spin" /> : <IconPlus className="size-4" />}Einladung erstellen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PortalsPage() {
  const [vendorTokens, setVendorTokens] = useState<PortalToken[]>([])
  const [customerTokens, setCustomerTokens] = useState<PortalToken[]>([])
  const [loadingVendor, setLoadingVendor] = useState(true)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [createDialog, setCreateDialog] = useState<{ open: boolean; type: "vendor" | "customer" }>({ open: false, type: "vendor" })

  const fetchVendorTokens = useCallback(async () => { try { const res = await fetch("/api/portal-tokens/vendor"); if (res.ok) setVendorTokens(await res.json()) } catch { /* silent */ } finally { setLoadingVendor(false) } }, [])
  const fetchCustomerTokens = useCallback(async () => { try { const res = await fetch("/api/portal-tokens/customer"); if (res.ok) setCustomerTokens(await res.json()) } catch { /* silent */ } finally { setLoadingCustomer(false) } }, [])

  useEffect(() => { void fetchVendorTokens(); void fetchCustomerTokens() }, [fetchVendorTokens, fetchCustomerTokens])

  async function handleRevoke(type: "vendor" | "customer", id: string) { await fetch(`/api/portal-tokens/${type}?id=${id}`, { method: "DELETE" }); if (type === "vendor") await fetchVendorTokens(); else await fetchCustomerTokens() }

  const activeVendorCount = vendorTokens.filter((t) => t.isActive && !isExpired(t)).length
  const activeCustomerCount = customerTokens.filter((t) => t.isActive && !isExpired(t)).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Externe Portale</h1><p className="text-sm text-muted-foreground mt-0.5">Verwalten Sie Portal-Zugänge für Lieferanten und Kunden</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2"><IconTruck className="size-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Lieferanten-Portale</p></div><p className="text-2xl font-bold text-foreground mt-1">{activeVendorCount}</p><p className="text-xs text-muted-foreground">aktiv</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2"><IconUsers className="size-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Kunden-Portale</p></div><p className="text-2xl font-bold text-foreground mt-1">{activeCustomerCount}</p><p className="text-xs text-muted-foreground">aktiv</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Einladungen</p><p className="text-2xl font-bold text-foreground mt-1">{vendorTokens.length + customerTokens.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Abgelaufen / Widerrufen</p><p className="text-2xl font-bold text-foreground mt-1">{[...vendorTokens, ...customerTokens].filter((t) => !t.isActive || isExpired(t)).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="vendor">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="vendor" className="gap-1.5"><IconTruck className="size-4" />Lieferanten{activeVendorCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{activeVendorCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="customer" className="gap-1.5"><IconUsers className="size-4" />Kunden{activeCustomerCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{activeCustomerCount}</Badge>}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setCreateDialog({ open: true, type: "vendor" })}><IconPlus className="size-4" />Lieferant einladen</Button>
            <Button className="gap-1.5" onClick={() => setCreateDialog({ open: true, type: "customer" })}><IconPlus className="size-4" />Kunde einladen</Button>
          </div>
        </div>
        <TabsContent value="vendor">
          <Card className="border-0 shadow-sm mt-4">
            <CardHeader><CardTitle className="text-base">Lieferanten-Portal Zugänge</CardTitle><CardDescription>Lieferanten können ihre Bestellungen einsehen, bestätigen und Notizen hinterlassen.</CardDescription></CardHeader>
            <CardContent className="p-0"><TokenTable tokens={vendorTokens} loading={loadingVendor} type="vendor" onRevoke={(id) => handleRevoke("vendor", id)} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="customer">
          <Card className="border-0 shadow-sm mt-4">
            <CardHeader><CardTitle className="text-base">Kunden-Portal Zugänge</CardTitle><CardDescription>Kunden können ihre Kommissionen verfolgen und Kommentare hinterlassen.</CardDescription></CardHeader>
            <CardContent className="p-0"><TokenTable tokens={customerTokens} loading={loadingCustomer} type="customer" onRevoke={(id) => handleRevoke("customer", id)} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTokenDialog open={createDialog.open} onOpenChange={(open) => setCreateDialog((prev) => ({ ...prev, open }))} type={createDialog.type} onCreated={() => { if (createDialog.type === "vendor") void fetchVendorTokens(); else void fetchCustomerTokens() }} />
    </div>
  )
}
