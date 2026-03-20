"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  IconCurrencyDollar,
  IconTrendingUp,
  IconCreditCard,
  IconUserMinus,
  IconExternalLink,
} from "@tabler/icons-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface RevenueData {
  mrr: number
  totalRevenue: number
  revenueByMonth: Array<{ month: string; amount: number }>
  activeSubscriptions: number
  cancelledLast30d: number
  avgRevenuePerUser: number
}

interface PaymentRow {
  id: string
  userId: string | null
  amount: number | null
  currency: string | null
  status: string
  stripeInvoiceId: string
  stripeSubscriptionId: string | null
  paidAt: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
  planId: string | null
  subscriptionStatus: string | null
}

function formatCHF(cents: number): string {
  return `CHF ${(cents / 100).toLocaleString("de-CH", { minimumFractionDigits: 2 })}`
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-")
  const monthNames = [
    "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
  ]
  return `${monthNames[Number(month) - 1]} ${year}`
}

function StatusBadge({ status }: { status: string }) {
  if (status === "succeeded") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
        Erfolgreich
      </Badge>
    )
  }
  if (status === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
        Ausstehend
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
        Fehlgeschlagen
      </Badge>
    )
  }
  return <Badge variant="secondary">{status}</Badge>
}

export default function AdminPaymentsPage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [paymentsData, setPaymentsData] = useState<PaymentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [revenueRes, paymentsRes] = await Promise.all([
          fetch("/api/admin/revenue"),
          fetch("/api/admin/payments?limit=20"),
        ])
        if (revenueRes.ok) {
          setRevenue(await revenueRes.json())
        }
        if (paymentsRes.ok) {
          const data = await paymentsRes.json()
          setPaymentsData(data.payments ?? [])
        }
      } catch (err) {
        console.error("Failed to fetch payment data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Lade Umsatzdaten...</p>
      </div>
    )
  }

  const chartData = (revenue?.revenueByMonth ?? []).map((r) => ({
    month: formatMonth(r.month),
    Umsatz: r.amount / 100,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Umsatz &amp; Zahlungen</h2>
        <p className="text-muted-foreground mt-2">
          Umsatzuebersicht, Abonnements und Zahlungshistorie
        </p>
      </div>

      {/* Revenue Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-sm font-medium">MRR</CardDescription>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenue ? formatCHF(revenue.mrr) : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monatlich wiederkehrender Umsatz
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-sm font-medium">Gesamtumsatz</CardDescription>
            <IconCurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenue ? formatCHF(revenue.totalRevenue) : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revenue
                ? `${formatCHF(revenue.avgRevenuePerUser)} pro Kunde`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-sm font-medium">Aktive Abos</CardDescription>
            <IconCreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenue?.activeSubscriptions ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-sm font-medium">Kuendigungen (30 Tage)</CardDescription>
            <IconUserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenue?.cancelledLast30d ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Umsatz pro Monat</CardTitle>
            <CardDescription>Letzte 6 Monate (in CHF)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v: number) => `${v.toLocaleString("de-CH")}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `CHF ${Number(value).toLocaleString("de-CH", { minimumFractionDigits: 2 })}`,
                      "Umsatz",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar
                    dataKey="Umsatz"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Zahlungen</CardTitle>
          <CardDescription>Die 20 neuesten Zahlungen aller Organisationen</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsData.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Keine Zahlungen gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stripe ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsData.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString("de-CH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.userName || "Unbekannt"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.userEmail || "—"}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap">
                        {p.amount != null
                          ? formatCHF(p.amount)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell>
                        <a
                          href={`https://dashboard.stripe.com/payments/${p.stripeInvoiceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="font-mono text-xs">
                            {p.stripeInvoiceId.slice(0, 20)}...
                          </span>
                          <IconExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
