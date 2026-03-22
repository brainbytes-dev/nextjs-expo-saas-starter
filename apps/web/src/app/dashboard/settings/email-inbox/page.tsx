"use client"

import { useTranslations } from "next-intl"

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

function typeIcon(type: string) {
  switch (type) {
    case "order": return <IconPackage className="size-4" />
    case "delivery": return <IconTruck className="size-4" />
    case "invoice": return <IconFileInvoice className="size-4" />
    default: return <IconQuestionMark className="size-4" />
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Field formatting helpers
// ---------------------------------------------------------------------------

const FIELD_NAME_KEYS: Record<string, string> = {
  orderNumber: "emailFieldOrderNumber", supplier: "emailFieldSupplier",
  items: "emailFieldItems", totalAmount: "emailFieldTotalAmount",
  currency: "emailFieldCurrency", deliveryDate: "emailFieldDeliveryDate",
  trackingNumber: "emailFieldTrackingNumber", carrier: "emailFieldCarrier",
  expectedDate: "emailFieldExpectedDate", orderReference: "emailFieldOrderReference",
  invoiceNumber: "emailFieldInvoiceNumber", amount: "emailFieldAmount",
  dueDate: "emailFieldDueDate", taxAmount: "emailFieldTaxAmount",
  notes: "emailFieldNotes",
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

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EmailInboxPage() {
  const t = useTranslations("settings")
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

  const inboxAddress = "inbox-{org-slug}@logistikapp.ch"

  const typeLabel = useCallback((type: string): string => {
    switch (type) {
      case "order": return t("emailTypeOrder")
      case "delivery": return t("emailTypeDelivery")
      case "invoice": return t("emailTypeInvoice")
      default: return t("emailTypeUnknown")
    }
  }, [t])

  const statusBadge = useCallback((status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">{t("emailStatusDraft")}</Badge>
      case "accepted":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400"><IconCheck className="size-3 mr-1" />{t("emailStatusAccepted")}</Badge>
      case "rejected":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400"><IconX className="size-3 mr-1" />{t("emailStatusRejected")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }, [t])

  const loadEmails = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.set("status", filterStatus)
      if (filterType !== "all") params.set("type", filterType)
      params.set("limit", "50")
      const res = await fetch(`/api/email/parsed?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmails(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setErrorMsg(t("emailLoadFailed"))
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType, t])

  useEffect(() => { void loadEmails() }, [loadEmails])

  const handleAction = async (id: string, status: "accepted" | "rejected") => {
    setActionLoading(id)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/email/parsed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error()
      setSuccessMsg(status === "accepted" ? t("emailAccepted") : t("emailRejected"))
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadEmails()
    } catch {
      setErrorMsg(t("emailActionFailed"))
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

  const fieldName = (key: string): string => {
    const k = FIELD_NAME_KEYS[key]
    return k ? t(k as any) : key
  }

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
          {t("title")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconMail className="size-6 text-primary" />
          {t("emailInboxTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("emailInboxDesc")}</p>
      </div>

      {/* Status messages */}
      {(errorMsg || successMsg) && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${errorMsg ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800"}`}>
          {errorMsg ? <IconX className="size-4 shrink-0" /> : <IconCheck className="size-4 shrink-0" />}
          <span>{errorMsg ?? successMsg}</span>
        </div>
      )}

      {/* Setup Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("emailSetup")}</CardTitle>
          <CardDescription>{t("emailSetupDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t("emailForwardAddress")}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">{inboxAddress}</code>
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? (<><IconCheck className="size-4 mr-1" />{t("copied")}</>) : (<><IconCopy className="size-4 mr-1" />{t("copy")}</>)}
              </Button>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("emailHowItWorks")}</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              <li>{t("emailStep1")}</li>
              <li>{t("emailStep2")}</li>
              <li>{t("emailStep3")}</li>
              <li>{t("emailStep4")}</li>
            </ol>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconMail className="size-3.5" />
            <span>
              {t("emailRequiresKey")}{" "}
              <a href="/dashboard/settings/ai" className="text-primary hover:underline inline-flex items-center gap-0.5">
                OpenAI API-Key <IconExternalLink className="size-3" />
              </a>
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("emailFilterStatus")}</span>
          {(["all", "draft", "accepted", "rejected"] as FilterStatus[]).map((s) => (
            <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)} className="text-xs">
              {s === "all" ? t("emailFilterAll") : s === "draft" ? t("emailFilterDrafts") : s === "accepted" ? t("emailFilterAccepted") : t("emailFilterRejected")}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("emailFilterType")}</span>
          {(["all", "order", "delivery", "invoice"] as FilterType[]).map((ft) => (
            <Button key={ft} variant={filterType === ft ? "default" : "outline"} size="sm" onClick={() => setFilterType(ft)} className="text-xs">
              {ft === "all" ? t("emailFilterAll") : typeLabel(ft)}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadEmails()} className="ml-auto">
          <IconRefresh className="size-4 mr-1" />{t("emailRefresh")}
        </Button>
      </div>

      {/* Emails Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {t("emailIncoming")}
            <Badge variant="outline" className="font-mono text-xs">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <IconLoader2 className="size-5 animate-spin mr-2" />{t("emailLoading")}
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IconMail className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t("emailNone")}</p>
              <p className="text-xs mt-1">{t("emailNoneHint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => {
                const isExpanded = expandedId === email.id
                const isActionPending = actionLoading === email.id
                return (
                  <div key={email.id} className="border rounded-lg overflow-hidden">
                    <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : email.id)}>
                      <div className="flex items-center gap-2 shrink-0">{typeIcon(email.emailType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-sm font-medium truncate">{email.subject}</span></div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{email.from}</span><span>·</span><span>{formatDate(email.receivedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{typeLabel(email.emailType)}</Badge>
                        {statusBadge(email.status)}
                        {isExpanded ? <IconChevronUp className="size-4 text-muted-foreground" /> : <IconChevronDown className="size-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t px-4 py-4 bg-muted/30 space-y-4">
                        {email.parsedData ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t("emailParsedData")}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(email.parsedData).filter(([key, val]) => key !== "type" && val !== null && val !== undefined).map(([key, val]) => (
                                <div key={key}>
                                  <span className="text-muted-foreground text-xs">{fieldName(key)}:</span>
                                  <p className="font-medium text-sm">{formatFieldValue(val)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{t("emailNoParsedData")}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <IconEye className="size-3.5" />
                          <span>{t("emailConfidence")} <strong>{Math.round(email.confidence * 100)}%</strong></span>
                        </div>
                        {email.status === "draft" && (
                          <div className="flex items-center gap-2 pt-2">
                            <Button size="sm" onClick={() => handleAction(email.id, "accepted")} disabled={isActionPending}>
                              {isActionPending ? <IconLoader2 className="size-4 mr-1 animate-spin" /> : <IconCheck className="size-4 mr-1" />}{t("emailAccept")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleAction(email.id, "rejected")} disabled={isActionPending}>
                              <IconX className="size-4 mr-1" />{t("emailReject")}
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

      <p className="text-xs text-muted-foreground">{t("emailPrivacy")}</p>
    </div>
  )
}
