"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface LocationItem {
  id: string
  name: string
  type: string
  template: string
  materialCount: number
  toolCount: number
  keyCount: number
}

const TYPE_LABELS: Record<string, string> = {
  warehouse: "Lager",
  vehicle: "Fahrzeug",
  site: "Baustelle",
  station: "Station",
  practice: "Praxis",
  operating_room: "OP-Saal",
  user: "Nutzer",
}

const TYPE_COLORS: Record<string, string> = {
  warehouse: "bg-primary/10 text-primary",
  vehicle: "bg-secondary/10 text-secondary",
  site: "bg-primary/10 text-primary",
  station: "bg-muted text-muted-foreground",
  practice: "bg-secondary/10 text-secondary",
  operating_room: "bg-destructive/10 text-destructive",
  user: "bg-muted text-muted-foreground",
}

const placeholderData: LocationItem[] = [
  { id: "1", name: "Hauptlager Zürich", type: "warehouse", template: "Standard Lager", materialCount: 342, toolCount: 56, keyCount: 12 },
  { id: "2", name: "Fahrzeug MU-ZH-123", type: "vehicle", template: "Servicefahrzeug", materialCount: 48, toolCount: 12, keyCount: 3 },
  { id: "3", name: "Baustelle Neubau Bern", type: "site", template: "Baustelle Gross", materialCount: 156, toolCount: 24, keyCount: 5 },
  { id: "4", name: "Aussenlager Basel", type: "warehouse", template: "Standard Lager", materialCount: 210, toolCount: 38, keyCount: 8 },
  { id: "5", name: "Fahrzeug MU-BE-456", type: "vehicle", template: "Montagefahrzeug", materialCount: 32, toolCount: 8, keyCount: 2 },
  { id: "6", name: "Station Notaufnahme", type: "station", template: "Notfallstation", materialCount: 89, toolCount: 15, keyCount: 4 },
]

export default function LocationsPage() {
  const t = useTranslations("masterData")
  const tc = useTranslations("common")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", type: "warehouse", template: "" })

  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(placeholderData)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const filtered = items.filter((item) =>
    [item.name, TYPE_LABELS[item.type] ?? item.type, item.template]
      .some((v) => v.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = () => {
    const newItem: LocationItem = {
      id: crypto.randomUUID(),
      name: form.name,
      type: form.type,
      template: form.template,
      materialCount: 0,
      toolCount: 0,
      keyCount: 0,
    }
    setItems((prev) => [...prev, newItem])
    setForm({ name: "", type: "warehouse", template: "" })
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("locations")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("title")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <IconPlus className="mr-2 size-4" />
              {t("addLocation")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addLocation")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t("type")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("template")}</Label>
                <Input value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
              <Button onClick={handleCreate} disabled={!form.name}>{tc("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                {t("noResults")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("template")}</TableHead>
                    <TableHead className="text-right">{t("materialCount")}</TableHead>
                    <TableHead className="text-right">{t("toolCount")}</TableHead>
                    <TableHead className="text-right">{t("keyCount")}</TableHead>
                    <TableHead className="w-[100px]">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_COLORS[item.type]}>
                          {TYPE_LABELS[item.type] ?? item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.template}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.materialCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.toolCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.keyCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8">
                            <IconEdit className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(item.id)}>
                            <IconTrash className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
