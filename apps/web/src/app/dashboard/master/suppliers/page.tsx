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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Supplier {
  id: string
  name: string
  supplierNumber: string
  contactPerson: string
  email: string
  phone: string
}

const placeholderData: Supplier[] = [
  { id: "1", name: "Hilti AG", supplierNumber: "LF-001", contactPerson: "Hans Meier", email: "hans@hilti.ch", phone: "+41 44 123 45 67" },
  { id: "2", name: "Würth Schweiz", supplierNumber: "LF-002", contactPerson: "Petra Keller", email: "petra@wuerth.ch", phone: "+41 44 234 56 78" },
  { id: "3", name: "Bossard AG", supplierNumber: "LF-003", contactPerson: "Marco Rossi", email: "marco@bossard.ch", phone: "+41 41 345 67 89" },
  { id: "4", name: "Debrunner Acifer", supplierNumber: "LF-004", contactPerson: "Sandra Huber", email: "sandra@dacifer.ch", phone: "+41 52 456 78 90" },
  { id: "5", name: "Haberkorn AG", supplierNumber: "LF-005", contactPerson: "Thomas Brunner", email: "thomas@haberkorn.ch", phone: "+41 71 567 89 01" },
]

export default function SuppliersPage() {
  const t = useTranslations("masterData")
  const tc = useTranslations("common")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", supplierNumber: "", contactPerson: "", email: "", phone: "" })

  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(placeholderData)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const filtered = items.filter((item) =>
    [item.name, item.supplierNumber, item.contactPerson, item.email]
      .some((v) => v.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = () => {
    const newItem: Supplier = {
      id: crypto.randomUUID(),
      ...form,
    }
    setItems((prev) => [...prev, newItem])
    setForm({ name: "", supplierNumber: "", contactPerson: "", email: "", phone: "" })
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("suppliers")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("title")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <IconPlus className="mr-2 size-4" />
              {t("addSupplier")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addSupplier")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t("supplierNumber")}</Label>
                <Input value={form.supplierNumber} onChange={(e) => setForm({ ...form, supplierNumber: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t("contactPerson")}</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t("email")}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t("phone")}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
                    <TableHead>{t("supplierNumber")}</TableHead>
                    <TableHead>{t("contactPerson")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("phone")}</TableHead>
                    <TableHead className="w-[100px]">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.supplierNumber}</TableCell>
                      <TableCell>{item.contactPerson}</TableCell>
                      <TableCell className="text-muted-foreground">{item.email}</TableCell>
                      <TableCell className="text-muted-foreground">{item.phone}</TableCell>
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
