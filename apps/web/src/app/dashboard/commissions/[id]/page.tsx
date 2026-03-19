"use client"

// ---------------------------------------------------------------------------
// Commission Detail Page — /dashboard/commissions/[id]
//
// Shows commission metadata, position table, and provides:
//   • "Lieferschein drucken" — opens PDF print window
//   • "Unterschrift erfassen" — opens SignatureDialog, marks as completed
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconPrinter,
  IconSignature,
  IconMapPin,
  IconUser,
  IconClipboardList,
  IconCheck,
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
import { Skeleton } from "@/components/ui/skeleton"
import { SignatureDialog } from "@/components/signature-dialog"
import {
  printLieferschein,
  buildLieferscheinEntries,
  type LieferscheinData,
  type RawCommissionEntry,
} from "@/lib/lieferschein-pdf"

// ── Types ───────────────────────────────────────────────────────────────────
interface CommissionDetail {
  id: string
  name: string
  number: string
  manualNumber: string | null
  status: string
  notes: string | null
  targetLocationId: string | null
  targetLocationName: string | null
  customerId: string | null
  customerName: string | null
  responsibleId: string | null
  responsibleName: string | null
  entryCount: number
  signature: string | null
  signedAt: string | null
  signedBy: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:        { label: "Offen",           color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Bearbeitung",  color: "bg-primary/10 text-primary" },
  completed:   { label: "Abgeschlossen",   color: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Storniert",       color: "bg-destructive/10 text-destructive" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function CommissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [commission, setCommission] = useState<CommissionDetail | null>(null)
  const [entries, setEntries] = useState<RawCommissionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sigOpen, setSigOpen] = useState(false)

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [commRes, entriesRes] = await Promise.all([
        fetch(`/api/commissions/${id}`),
        fetch(`/api/commissions/${id}/entries`),
      ])

      if (!commRes.ok) throw new Error("Kommission nicht gefunden.")
      const commData = await commRes.json()
      setCommission(commData)

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json()
        setEntries(entriesData.data ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Print handler ──────────────────────────────────────────────────────
  function handlePrint() {
    if (!commission) return

    const data: LieferscheinData = {
      number: `K-${String(commission.number).padStart(4, "0")}`,
      manualNumber: commission.manualNumber,
      commissionName: commission.name,
      customerName: commission.customerName,
      customerAddress: null,
      targetLocation: commission.targetLocationName ?? "—",
      responsible: commission.responsibleName ?? "—",
      createdAt: commission.createdAt,
      entries: buildLieferscheinEntries(entries),
      signature: commission.signature,
      signedAt: commission.signedAt ? new Date(commission.signedAt) : null,
      signedBy: commission.signedBy,
      org: {
        // Fall back to generic branding — replace with real org data when available
        name: "LogistikApp",
        address: null,
        zip: null,
        city: null,
        country: "CH",
        logo: null,
      },
    }
    printLieferschein(data)
  }

  // ── After signature saved ──────────────────────────────────────────────
  function handleSigned(dataUrl: string, signedBy: string) {
    setCommission((prev) =>
      prev
        ? {
            ...prev,
            signature: dataUrl,
            signedAt: new Date().toISOString(),
            signedBy,
            status: "completed",
          }
        : prev,
    )
  }

  // ── Loading / error states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !commission) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-destructive">{error ?? "Kommission nicht gefunden."}</p>
        <Button variant="outline" onClick={() => router.back()}>Zurück</Button>
      </div>
    )
  }

  const statusCfg = STATUS_LABELS[commission.status] ?? STATUS_LABELS.open
  const isSigned = !!commission.signature
  const canSign = !isSigned && commission.status !== "cancelled"

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {commission.name}
              </h1>
              <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              {`K-${String(commission.number).padStart(4, "0")}`}
              {commission.manualNumber && ` / ${commission.manualNumber}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSign && (
            <Button variant="outline" onClick={() => setSigOpen(true)} className="gap-2">
              <IconSignature className="size-4" />
              Unterschrift erfassen
            </Button>
          )}
          {isSigned && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <IconCheck className="size-4" />
              Unterschrieben
            </div>
          )}
          <Button onClick={handlePrint} className="gap-2">
            <IconPrinter className="size-4" />
            Lieferschein drucken
          </Button>
        </div>
      </div>

      {/* ── Metadata cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kunde</p>
            <div className="flex items-center gap-1.5">
              <IconUser className="size-3.5 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">{commission.customerName ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lieferort</p>
            <div className="flex items-center gap-1.5">
              <IconMapPin className="size-3.5 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">{commission.targetLocationName ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verantwortlich</p>
            <div className="flex items-center gap-1.5">
              <IconUser className="size-3.5 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">{commission.responsibleName ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Signature preview (if already signed) ─────────────────── */}
      {isSigned && commission.signature && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Digitale Unterschrift</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-8 p-4 pt-0">
            <img
              src={commission.signature}
              alt="Unterschrift"
              className="max-h-24 max-w-[240px] border border-border rounded-md bg-white"
            />
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {commission.signedBy && (
                <p><span className="font-medium text-foreground">Empfangen von:</span> {commission.signedBy}</p>
              )}
              {commission.signedAt && (
                <p><span className="font-medium text-foreground">Datum:</span> {formatDate(commission.signedAt)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Entries table ──────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconClipboardList className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Positionen ({entries.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Keine Positionen vorhanden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">Pos.</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">Artikelnr.</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bezeichnung</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-20 text-right">Menge</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Einheit</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={entry.id} className="hover:bg-muted/80 border-b border-border">
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.materialNumber ?? entry.toolNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">
                        {entry.materialName ?? entry.toolName ?? "Unbekannt"}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {entry.quantity ?? 1}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.materialUnit ?? "Stk"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${
                        (entry as { status?: string }).status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : (entry as { status?: string }).status === "picked"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {(entry as { status?: string }).status === "completed"
                          ? "Erledigt"
                          : (entry as { status?: string }).status === "picked"
                          ? "Gepickt"
                          : "Offen"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Notes ─────────────────────────────────────────────────── */}
      {commission.notes && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{commission.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Signature Dialog ───────────────────────────────────────── */}
      <SignatureDialog
        commissionId={commission.id}
        commissionNumber={`K-${String(commission.number).padStart(4, "0")}`}
        open={sigOpen}
        onOpenChange={setSigOpen}
        onSigned={handleSigned}
      />
    </div>
  )
}
