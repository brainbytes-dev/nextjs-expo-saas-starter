"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"

interface AdminOrg {
  id: string
  name: string
  slug: string
  industry: string | null
  plan: string
  planOverride: string | null
  enabledFeatures: string[] | null
  adminNotes: string | null
  userCount: number
  materialCount: number
  toolCount: number
  createdAt: string
}

const INDUSTRY_LABELS: Record<string, string> = {
  handwerk: "Handwerk",
  rettungsdienst: "Rettungsdienst",
  arztpraxis: "Arztpraxis",
  spital: "Spital",
}

function planBadgeClass(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200"
    case "professional":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200"
    default:
      return ""
  }
}

export default function AdminOrganizationsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/admin/organizations")
        if (res.ok) {
          const data = await res.json()
          setOrgs(data.organizations || [])
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrgs()
  }, [])

  const filtered = useMemo(() => {
    return orgs.filter((org) => {
      const matchesSearch =
        !search ||
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.slug.toLowerCase().includes(search.toLowerCase()) ||
        (org.industry || "").toLowerCase().includes(search.toLowerCase())

      const matchesPlan = planFilter === "all" || org.plan === planFilter

      return matchesSearch && matchesPlan
    })
  }, [orgs, search, planFilter])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Organisationen</h2>
        <p className="text-muted-foreground mt-2">
          Alle Kunden-Organisationen verwalten ({orgs.length} gesamt)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Organisation suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plan filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground py-12 text-center">Lade Organisationen...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {orgs.length === 0
                ? "Keine Organisationen gefunden."
                : "Keine Ergebnisse fuer diesen Filter."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branche</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Benutzer</TableHead>
                  <TableHead className="text-right">Materialien</TableHead>
                  <TableHead className="text-right">Werkzeuge</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">/{org.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {INDUSTRY_LABELS[org.industry || ""] || org.industry || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={planBadgeClass(org.plan)}>
                        {org.plan === "professional"
                          ? "Professional"
                          : org.plan === "enterprise"
                            ? "Enterprise"
                            : "Starter"}
                      </Badge>
                      {org.planOverride && (
                        <span className="text-[10px] text-muted-foreground ml-1">Override</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{org.userCount}</TableCell>
                    <TableCell className="text-right">{org.materialCount}</TableCell>
                    <TableCell className="text-right">{org.toolCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString("de-CH")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
