"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { IconClipboardList, IconCheck, IconClock, IconPlayerPlay, IconX, IconChevronDown, IconChevronRight, IconSend, IconLoader2, IconAlertTriangle, IconMapPin, IconUser, IconPackage, IconTool, IconMessageCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

interface CommissionEntry { id: string; quantity: number | null; pickedQuantity: number | null; status: string | null; materialName: string | null; materialNumber: string | null; toolName: string | null; toolNumber: string | null }
interface CommissionComment { id: string; body: string; createdAt: string }
interface Commission { id: string; name: string; number: number | null; manualNumber: string | null; status: string | null; notes: string | null; targetLocationName: string | null; responsibleName: string | null; createdAt: string; updatedAt: string; entries: CommissionEntry[]; comments: CommissionComment[] }
interface PortalData { customer: { name: string }; org: { name: string; logo: string | null; primaryColor: string | null }; commissions: Commission[] }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: "Offen", color: "bg-muted text-muted-foreground", icon: IconClock },
  in_progress: { label: "In Bearbeitung", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: IconPlayerPlay },
  completed: { label: "Abgeschlossen", color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300", icon: IconCheck },
  cancelled: { label: "Storniert", color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", icon: IconX },
}

function formatDate(iso: string | null) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }) }
function formatDateTime(iso: string | null) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) }

function ProgressBar({ total, picked }: { total: number; picked: number }) {
  const pct = total > 0 ? Math.round((picked / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all bg-primary" style={{ width: `${pct}%` }} /></div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{picked}/{total} ({pct}%)</span>
    </div>
  )
}

export default function CustomerPortalPage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedComms, setExpandedComms] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/customer/${params.token}`)
      if (!res.ok) { const err = await res.json(); setError(err.error || "Zugriff verweigert"); return }
      setData(await res.json())
    } catch { setError("Netzwerkfehler") } finally { setLoading(false) }
  }, [params.token])

  useEffect(() => { void fetchData() }, [fetchData])

  function toggleExpand(id: string) { setExpandedComms((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }

  async function handleSendComment(commissionId: string) {
    const body = commentDrafts[commissionId]?.trim()
    if (!body) return
    setSending(commissionId)
    try {
      await fetch(`/api/portal/customer/${params.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commissionId, body }) })
      setCommentDrafts((prev) => ({ ...prev, [commissionId]: "" }))
      await fetchData()
    } catch { /* silent */ } finally { setSending(null) }
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

  const primaryColor = data.org.primaryColor || null
  const brandStyle = primaryColor ? { backgroundColor: primaryColor } : undefined

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4 py-4 border-b border-border">
        {data.org.logo ? (
          <Image src={data.org.logo} alt={data.org.name} width={40} height={40} className="h-10 w-10 rounded-lg object-contain" unoptimized />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg" style={brandStyle}>{data.org.name.charAt(0)}</div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{data.org.name}</h1>
          <p className="text-sm text-muted-foreground">Kunden-Portal &mdash; {data.customer.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["open", "in_progress", "completed", "cancelled"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s]; const count = data.commissions.filter((c) => c.status === s).length
          return <Card key={s} className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{cfg.label}</p><p className="text-2xl font-bold text-foreground mt-1">{count}</p></CardContent></Card>
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Kommissionen</h2>
        {data.commissions.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><IconClipboardList className="size-12 text-muted-foreground/40 mx-auto mb-3" /><p className="text-muted-foreground">Keine Kommissionen vorhanden.</p></CardContent></Card>
        ) : data.commissions.map((comm) => {
          const isExpanded = expandedComms.has(comm.id)
          const cfg = STATUS_CONFIG[comm.status || "open"] || STATUS_CONFIG.open
          const StatusIcon = cfg.icon
          const totalQty = comm.entries.reduce((s, e) => s + (e.quantity ?? 0), 0)
          const pickedQty = comm.entries.reduce((s, e) => s + (e.pickedQuantity ?? 0), 0)

          return (
            <Card key={comm.id} className="border-0 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleExpand(comm.id)}>
                <div className="flex-shrink-0">{isExpanded ? <IconChevronDown className="size-4 text-muted-foreground" /> : <IconChevronRight className="size-4 text-muted-foreground" />}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{comm.name}</p>
                    <span className="text-xs font-mono text-muted-foreground">K-{String(comm.number).padStart(3, "0")}{comm.manualNumber && ` / ${comm.manualNumber}`}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${cfg.color}`}><StatusIcon className="size-3" />{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {comm.targetLocationName && <span className="inline-flex items-center gap-1"><IconMapPin className="size-3" />{comm.targetLocationName}</span>}
                    {comm.responsibleName && <span className="inline-flex items-center gap-1"><IconUser className="size-3" />{comm.responsibleName}</span>}
                    <span>{formatDate(comm.createdAt)}</span>
                  </div>
                  {totalQty > 0 && <div className="max-w-xs"><ProgressBar total={totalQty} picked={pickedQty} /></div>}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border">
                  {comm.entries.length > 0 && (
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Positionen</p>
                      {comm.entries.map((entry) => {
                        const name = entry.materialName || entry.toolName || "—"
                        const number = entry.materialNumber || entry.toolNumber
                        const isMaterial = !!entry.materialName
                        const isDone = (entry.pickedQuantity ?? 0) >= (entry.quantity ?? 0)
                        return (
                          <div key={entry.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30">
                            {isMaterial ? <IconPackage className="size-4 text-muted-foreground/60 flex-shrink-0" /> : <IconTool className="size-4 text-muted-foreground/60 flex-shrink-0" />}
                            <div className="flex-1 min-w-0"><p className="text-sm text-foreground truncate">{name}</p>{number && <p className="text-xs text-muted-foreground font-mono">{number}</p>}</div>
                            <div className="text-right"><span className={`text-sm font-medium ${isDone ? "text-green-600" : "text-foreground"}`}>{entry.pickedQuantity ?? 0}/{entry.quantity ?? 0}</span></div>
                            {isDone && <IconCheck className="size-4 text-green-600" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {comm.notes && <div className="px-4 pb-3"><p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Notizen:</span> {comm.notes}</p></div>}
                  <div className="p-4 bg-muted/20 space-y-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><IconMessageCircle className="size-3.5" />Kommentare ({comm.comments.length})</p>
                    {comm.comments.map((c) => (
                      <div key={c.id} className="bg-background rounded-md p-3 text-sm"><p className="text-foreground">{c.body}</p><p className="text-xs text-muted-foreground mt-1">{formatDateTime(c.createdAt)}</p></div>
                    ))}
                    <div className="flex gap-2">
                      <Textarea placeholder="Kommentar schreiben..." value={commentDrafts[comm.id] ?? ""} onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [comm.id]: e.target.value }))} className="flex-1 min-h-[50px] bg-background" />
                      <Button size="sm" className="gap-1.5 self-end" style={brandStyle} onClick={() => handleSendComment(comm.id)} disabled={sending === comm.id || !commentDrafts[comm.id]?.trim()}>
                        {sending === comm.id ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconSend className="size-3.5" />}Senden
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="text-center py-6 border-t border-border">
        <p className="text-xs text-muted-foreground">Bereitgestellt von <span className="font-semibold">Logistik<span className="text-primary" style={primaryColor ? { color: primaryColor } : undefined}>App</span></span></p>
      </div>
    </div>
  )
}
