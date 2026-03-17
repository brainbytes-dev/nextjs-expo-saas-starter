"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
import {
  IconPlus,
  IconSearch,
  IconTool,
  IconCheck,
  IconX,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconUpload,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from "@tabler/icons-react"

// ── Types ──────────────────────────────────────────────────────────────
type ToolCondition = "good" | "damaged" | "repair" | "decommissioned"

interface ToolGroup {
  id: string
  name: string
  color: string | null
}

interface ToolItem {
  id: string
  number: string | null
  name: string
  image: string | null
  group: ToolGroup | null
  homeLocation: string | null
  assignedTo: string | null
  assignedLocation: string | null
  isHome: boolean
  condition: ToolCondition
  lastMaintenance: string | null
  nextMaintenance: string | null
}

type SortKey = "name" | "group" | "homeLocation" | "assignedTo" | "condition" | "nextMaintenance"

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_GROUPS: ToolGroup[] = [
  { id: "1", name: "Elektrowerkzeuge", color: "#3b82f6" },
  { id: "2", name: "Handwerkzeuge", color: "#10b981" },
  { id: "3", name: "Messinstrumente", color: "#f59e0b" },
]

const MOCK_TOOLS: ToolItem[] = [
  {
    id: "1",
    number: "WZ-001",
    name: "Bohrmaschine Hilti TE 6-A22",
    image: null,
    group: MOCK_GROUPS[0]!,
    homeLocation: "Hauptlager",
    assignedTo: null,
    assignedLocation: null,
    isHome: true,
    condition: "good",
    lastMaintenance: "2025-12-01",
    nextMaintenance: "2026-06-01",
  },
  {
    id: "2",
    number: "WZ-002",
    name: "Akkuschrauber Makita DDF484",
    image: null,
    group: MOCK_GROUPS[0]!,
    homeLocation: "Hauptlager",
    assignedTo: "Max Müller",
    assignedLocation: "Baustelle Zürich",
    isHome: false,
    condition: "good",
    lastMaintenance: "2026-01-15",
    nextMaintenance: "2026-07-15",
  },
  {
    id: "3",
    number: "WZ-003",
    name: "Wasserwaage Stabila 196-2",
    image: null,
    group: MOCK_GROUPS[2]!,
    homeLocation: "Fahrzeug 1",
    assignedTo: "Anna Schmid",
    assignedLocation: "Baustelle Bern",
    isHome: false,
    condition: "damaged",
    lastMaintenance: "2025-09-10",
    nextMaintenance: "2026-03-10",
  },
  {
    id: "4",
    number: "WZ-004",
    name: "Winkelschleifer Bosch GWS 18V",
    image: null,
    group: MOCK_GROUPS[0]!,
    homeLocation: "Hauptlager",
    assignedTo: null,
    assignedLocation: null,
    isHome: true,
    condition: "repair",
    lastMaintenance: "2025-11-20",
    nextMaintenance: "2026-05-20",
  },
  {
    id: "5",
    number: "WZ-005",
    name: "Stichsäge Festool PSB 420",
    image: null,
    group: MOCK_GROUPS[0]!,
    homeLocation: "Hauptlager",
    assignedTo: null,
    assignedLocation: null,
    isHome: true,
    condition: "decommissioned",
    lastMaintenance: null,
    nextMaintenance: null,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────
const conditionConfig: Record<
  ToolCondition,
  { label: string; className: string }
> = {
  good: {
    label: "Gut",
    className: "bg-secondary/10 text-secondary",
  },
  damaged: {
    label: "Beschädigt",
    className: "bg-primary/10 text-primary",
  },
  repair: {
    label: "Reparatur",
    className: "bg-destructive/10 text-destructive",
  },
  decommissioned: {
    label: "Ausgemustert",
    className: "bg-muted text-muted-foreground",
  },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function downloadCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const lines = [
    headers.join(";"),
    ...rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function cmp(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a.toLowerCase().localeCompare(b.toLowerCase(), "de")
}

// ── Sort Icon ──────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <IconSelector className="ml-1 size-3.5 text-muted-foreground/50" />
  return dir === "asc"
    ? <IconChevronUp className="ml-1 size-3.5" />
    : <IconChevronDown className="ml-1 size-3.5" />
}

// ── Component ──────────────────────────────────────────────────────────
export default function ToolsPage() {
  const t = useTranslations("tools")
  const tc = useTranslations("common")
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [conditionFilter, setConditionFilter] = useState<string>("all")
  const [assignedFilter, setAssignedFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filteredTools = useMemo(() => {
    return MOCK_TOOLS.filter((tool) => {
      const matchesSearch =
        !search ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.number?.toLowerCase().includes(search.toLowerCase())

      const matchesGroup =
        groupFilter === "all" || tool.group?.id === groupFilter

      const matchesCondition =
        conditionFilter === "all" || tool.condition === conditionFilter

      const matchesAssigned =
        assignedFilter === "all" ||
        (assignedFilter === "assigned" && tool.assignedTo) ||
        (assignedFilter === "unassigned" && !tool.assignedTo)

      return matchesSearch && matchesGroup && matchesCondition && matchesAssigned
    })
  }, [search, groupFilter, conditionFilter, assignedFilter])

  const sortedTools = useMemo(() => {
    if (!sortKey) return filteredTools
    return [...filteredTools].sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "name":
          result = cmp(a.name, b.name)
          break
        case "group":
          result = cmp(a.group?.name, b.group?.name)
          break
        case "homeLocation":
          result = cmp(a.homeLocation, b.homeLocation)
          break
        case "assignedTo":
          result = cmp(a.assignedTo, b.assignedTo)
          break
        case "condition":
          result = cmp(a.condition, b.condition)
          break
        case "nextMaintenance":
          result = cmp(a.nextMaintenance, b.nextMaintenance)
          break
      }
      return sortDir === "asc" ? result : -result
    })
  }, [filteredTools, sortKey, sortDir])

  function handleExportCsv() {
    const headers = ["Nummer", "Name", "Gruppe", "Heimstandort", "Zugewiesen An", "Zustand", "Letzte Wartung", "Nächste Wartung"]
    const rows = sortedTools.map(tool => [
      tool.number,
      tool.name,
      tool.group?.name ?? null,
      tool.homeLocation,
      tool.assignedTo,
      conditionConfig[tool.condition].label,
      tool.lastMaintenance,
      tool.nextMaintenance,
    ])
    downloadCsv(headers, rows, "werkzeuge.csv")
  }

  function SortableHead({ label, sortKeyValue, className }: { label: string; sortKeyValue: SortKey; className?: string }) {
    return (
      <TableHead
        className={`cursor-pointer select-none ${className ?? ""}`}
        onClick={() => handleSort(sortKeyValue)}
      >
        <span className="inline-flex items-center">
          {label}
          <SortIcon active={sortKey === sortKeyValue} dir={sortDir} />
        </span>
      </TableHead>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {filteredTools.length} {t("title")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleExportCsv} title="CSV exportieren">
            <IconDownload className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/tools/import")}
          >
            <IconUpload className="size-4" />
            Import
          </Button>
          <Button onClick={() => router.push("/dashboard/tools/new")}>
            <IconPlus className="size-4" />
            {t("addTool")}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <IconSearch className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                placeholder={`${tc("search")}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("group")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")} {t("group")}n</SelectItem>
                  {MOCK_GROUPS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("condition")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")} {t("condition")}</SelectItem>
                  <SelectItem value="good">Gut</SelectItem>
                  <SelectItem value="damaged">Beschädigt</SelectItem>
                  <SelectItem value="repair">Reparatur</SelectItem>
                  <SelectItem value="decommissioned">Ausgemustert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder={t("assignedTo")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc("all")}</SelectItem>
                  <SelectItem value="assigned">{t("assignedTo")}</SelectItem>
                  <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {filteredTools.length === 0 ? (
        <Empty className="border rounded-lg py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconTool />
            </EmptyMedia>
            <EmptyTitle>{tc("noData")}</EmptyTitle>
            <EmptyDescription>
              Erstellen Sie Ihr erstes Werkzeug, um es hier zu sehen.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => router.push("/dashboard/tools/new")}>
            <IconPlus className="size-4" />
            {t("addTool")}
          </Button>
        </Empty>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">{t("tabs.general") === "Allgemeine Daten" ? "Bild" : "Bild"}</TableHead>
                  <TableHead>{t("number")}</TableHead>
                  <SortableHead label={t("name")} sortKeyValue="name" />
                  <SortableHead label={t("group")} sortKeyValue="group" />
                  <SortableHead label={t("home")} sortKeyValue="homeLocation" />
                  <SortableHead label={t("assignedTo")} sortKeyValue="assignedTo" />
                  <TableHead className="text-center">{t("isHome")}</TableHead>
                  <SortableHead label={t("condition")} sortKeyValue="condition" />
                  <TableHead>{t("lastMaintenance")}</TableHead>
                  <SortableHead label={t("maintenanceDue")} sortKeyValue="nextMaintenance" />
                  <TableHead className="w-[50px]">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTools.map((tool) => {
                  const cond = conditionConfig[tool.condition]
                  return (
                    <TableRow
                      key={tool.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/tools/${tool.id}`)}
                    >
                      {/* Image */}
                      <TableCell>
                        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
                          {tool.image ? (
                            <img
                              src={tool.image}
                              alt={tool.name}
                              className="size-10 rounded-md object-cover"
                            />
                          ) : (
                            <IconTool className="text-muted-foreground size-5" />
                          )}
                        </div>
                      </TableCell>

                      {/* Nummer */}
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {tool.number ?? "-"}
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-semibold">{tool.name}</TableCell>

                      {/* Group */}
                      <TableCell>
                        {tool.group ? (
                          <Badge
                            variant="outline"
                            className="border-transparent"
                            style={{
                              backgroundColor: tool.group.color
                                ? `${tool.group.color}20`
                                : undefined,
                              color: tool.group.color ?? undefined,
                            }}
                          >
                            {tool.group.name}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      {/* Home Location */}
                      <TableCell>{tool.homeLocation ?? "-"}</TableCell>

                      {/* Assigned To */}
                      <TableCell>{tool.assignedTo ?? "-"}</TableCell>

                      {/* Is Home */}
                      <TableCell className="text-center">
                        {tool.isHome ? (
                          <span className="inline-flex items-center gap-1 text-secondary">
                            <IconCheck className="size-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <IconX className="size-4" />
                          </span>
                        )}
                      </TableCell>

                      {/* Condition */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-transparent ${cond.className}`}
                        >
                          {cond.label}
                        </Badge>
                      </TableCell>

                      {/* Last Maintenance */}
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(tool.lastMaintenance)}
                      </TableCell>

                      {/* Next Maintenance */}
                      <TableCell className="text-sm">
                        <span
                          className={
                            tool.nextMaintenance &&
                            new Date(tool.nextMaintenance) < new Date()
                              ? "font-semibold text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {formatDate(tool.nextMaintenance)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/tools/${tool.id}`)
                              }}
                            >
                              <IconEye className="size-4" />
                              {tc("details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/tools/${tool.id}`)
                              }}
                            >
                              <IconEdit className="size-4" />
                              {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconTrash className="size-4" />
                              {tc("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
