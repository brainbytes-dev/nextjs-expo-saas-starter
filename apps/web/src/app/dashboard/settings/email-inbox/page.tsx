"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconMail,
  IconCheck,
  IconX,
  IconLoader2,
  IconExternalLink,
  IconPackage,
  IconTruck,
  IconFileInvoice,
  IconQuestionMark,
  IconCopy,
  IconRefresh,
  IconEye,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedEmailItem {
  id: string
  orgId: string
  from: string
  subject: string
  receivedAt: string
  emailType: "order" | "delivery" | "invoice" | "unknown"
  confidence: number
  parsedData: Record<string, unknown> | null
  status: "draft" | "accepted" | "rejected"
}

type FilterStatus = "all" | "draft" | "accepted" | "rejected"
type FilterType = "all" | "order" | "delivery" | "invoice"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function typeLabel(type: string): string {
  switch (type) {
    case "order":
      return "Bestellung"
    case "delivery":
      return "Lieferung"
    case "invoice":
      return "Rechnung"
    default:
      return "Unbekannt"
  }
}

function typeIcon(type: string) {
  switch (type) {
    case "order":
      return <IconPackage className="size-4" />
    case "delivery":
      return <IconTruck className="size-4" />
    case "invoice":
      return <IconFileInvoice className="size-4" />
    default:
      return <IconQuestionMark className="size-4" />
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          Entwurf
        </Badge>
      )
    case "accepted":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400">
          <IconCheck className="size-3 mr-1" />
          Übernommen
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400">
          <IconX className="size-3 mr-1" />
          Abgelehnt
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EmailInboxPage() {
  const [emails, setEmails] = useState<ParsedEmailItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // The forwarding address
  const inboxAddress = "inbox-{org-slug}@logistikapp.ch"

  // ── Load emails ───────────────────────────────────────────────────────────
  const loadEmails = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.set("status", filterStatus)
      if (filterType !== "all") params.set("type", filterType)
      params.set("limit", "50")

      const res = await fetch(`/api/email/parsed?${params.toString()}`)
      if (!res.ok) throw new Error("Laden fehlgeschlagen")

      const data = await res.json()
      setEmails(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setErrorMsg("E-Mails konnten nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    void loadEmails()
  }, [loadEmails])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAction = async (id: string, status: "accepted" | "rejected") => {
    setActionLoading(id)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/email/parsed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error("Aktualisierung fehlgeschlagen")

      setSuccessMsg(
        status === "accepted"
          ? "E-Mail-Daten übernommen"
          : "E-Mail abgelehnt"
      )
      setTimeout(() => setSuccessMsg(null), 3000)

      // Refresh list
      await loadEmails()
    } catch {
      setErrorMsg("Aktion fehlgeschlagen")
    } finally {
      setActionLoading(null)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inboxAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
          Einstellungen
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconMail className="size-6 text-primary" />
          E-Mail Posteingang
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lieferanten-E-Mails automatisch parsen und als Entwürfe anlegen.
        </p>
      </div>

      {/* Status messages */}
      {(errorMsg || successMsg) && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            errorMsg
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800"
          }`}
        >
          {errorMsg ? (
            <IconX className="size-4 shrink-0" />
          ) : (
            <IconCheck className="size-4 shrink-0" />
          )}
          <span>{errorMsg ?? successMsg}</span>
        </div>
      )}

      {/* Setup Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Einrichtung</CardTitle>
          <CardDescription>
            Leiten Sie Lieferanten-E-Mails an Ihre persönliche LogistikApp-Adresse weiter,
            um Bestellungen, Lieferavise und Rechnungen automatisch zu erkennen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Weiterleitungsadresse:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
                {inboxAddress}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <IconCheck className="size-4 mr-1" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <IconCopy className="size-4 mr-1" />
                    Kopieren
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">So funktioniert&apos;s:</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              <li>Richten Sie eine E-Mail-Weiterleitung bei Ihrem Lieferanten oder E-Mail-Provider ein</li>
              <li>Eingehende E-Mails werden automatisch per KI analysiert</li>
              <li>Erkannte Daten erscheinen als Entwurf in der Tabelle unten</li>
              <li>Prüfen Sie die Daten und übernehmen Sie sie mit einem Klick</li>
            </ol>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconMail className="size-3.5" />
            <span>
              Benötigt einen konfigurierten{" "}
              <a
                href="/dashboard/settings/ai"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                OpenAI API-Key
                <IconExternalLink className="size-3" />
              </a>
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {(["all", "draft", "accepted", "rejected"] as FilterStatus[]).map(
            (s) => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(s)}
                className="text-xs"
              >
                {s === "all"
                  ? "Alle"
                  : s === "draft"
                  ? "Entwürfe"
                  : s === "accepted"
                  ? "Übernommen"
                  : "Abgelehnt"}
              </Button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Typ:</span>
          {(["all", "order", "delivery", "invoice"] as FilterType[]).map(
            (t) => (
              <Button
                key={t}
                variant={filterType === t ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(t)}
                className="text-xs"
              >
                {t === "all" ? "Alle" : typeLabel(t)}
              </Button>
            )
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void loadEmails()}
          className="ml-auto"
        >
          <IconRefresh className="size-4 mr-1" />
          Aktualisieren
        </Button>
      </div>

      {/* Emails Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Eingehende E-Mails
            <Badge variant="outline" className="font-mono text-xs">
              {total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <IconLoader2 className="size-5 animate-spin mr-2" />
              Lade E-Mails...
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IconMail className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Keine E-Mails vorhanden</p>
              <p className="text-xs mt-1">
                Eingehende E-Mails erscheinen hier automatisch.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => {
                const isExpanded = expandedId === email.id
                const isActionPending = actionLoading === email.id

                return (
                  <div
                    key={email.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Row header */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : email.id)
                      }
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        {typeIcon(email.emailType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {email.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{email.from}</span>
                          <span>·</span>
                          <span>{formatDate(email.receivedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {typeLabel(email.emailType)}
                        </Badge>
                        {statusBadge(email.status)}
                        {isExpanded ? (
                          <IconChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <IconChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t px-4 py-4 bg-muted/30 space-y-4">
                        {/* Parsed data */}
                        {email.parsedData ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Erkannte Daten
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(email.parsedData)
                                .filter(
                                  ([key, val]) =>
                                    key !== "type" &&
                                    val !== null &&
                                    val !== undefined
                                )
                                .map(([key, val]) => (
                                  <div key={key}>
                                    <span className="text-muted-foreground text-xs">
                                      {formatFieldName(key)}:
                                    </span>
                                    <p className="font-medium text-sm">
                                      {formatFieldValue(val)}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Keine strukturierten Daten erkannt (Konfidenz zu
                            niedrig).
                          </p>
                        )}

                        {/* Confidence */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <IconEye className="size-3.5" />
                          <span>
                            KI-Konfidenz:{" "}
                            <strong>
                              {Math.round(email.confidence * 100)}%
                            </strong>
                          </span>
                        </div>

                        {/* Action buttons */}
                        {email.status === "draft" && (
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAction(email.id, "accepted")
                              }
                              disabled={isActionPending}
                            >
                              {isActionPending ? (
                                <IconLoader2 className="size-4 mr-1 animate-spin" />
                              ) : (
                                <IconCheck className="size-4 mr-1" />
                              )}
                              Übernehmen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleAction(email.id, "rejected")
                              }
                              disabled={isActionPending}
                            >
                              <IconX className="size-4 mr-1" />
                              Ablehnen
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy note */}
      <p className="text-xs text-muted-foreground">
        E-Mail-Inhalte werden zur Analyse an OpenAI gesendet. Nur strukturierte
        Daten (Bestellnummern, Mengen, Preise) werden in LogistikApp
        gespeichert. Rohe E-Mail-Texte werden nach der Verarbeitung nicht
        dauerhaft aufbewahrt.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field formatting helpers
// ---------------------------------------------------------------------------

function formatFieldName(key: string): string {
  const map: Record<string, string> = {
    orderNumber: "Bestellnummer",
    supplier: "Lieferant",
    items: "Positionen",
    totalAmount: "Gesamtbetrag",
    currency: "Währung",
    deliveryDate: "Lieferdatum",
    trackingNumber: "Sendungsnummer",
    carrier: "Spediteur",
    expectedDate: "Erwartetes Datum",
    orderReference: "Bestellreferenz",
    invoiceNumber: "Rechnungsnummer",
    amount: "Betrag",
    dueDate: "Fälligkeitsdatum",
    taxAmount: "MwSt.",
    notes: "Bemerkungen",
  }
  return map[key] ?? key
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "number") return val.toLocaleString("de-CH")
  if (typeof val === "string") return val
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const name = (item as Record<string, unknown>).name ?? ""
          const qty = (item as Record<string, unknown>).quantity ?? ""
          return `${name} (${qty})`
        }
        return String(item)
      })
      .join(", ")
  }
  return JSON.stringify(val)
}
