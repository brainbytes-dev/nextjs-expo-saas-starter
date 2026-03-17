"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  IconArrowLeft,
  IconTool,
  IconLogin,
  IconLogout,
  IconCheck,
  IconX,
  IconCalendar,
  IconUser,
  IconMapPin,
  IconClipboardCheck,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { QrCodeDisplay } from "@/components/qr-code"

// ── Types ──────────────────────────────────────────────────────────────
type ToolCondition = "good" | "damaged" | "repair" | "decommissioned"

interface ToolBooking {
  id: string
  date: string
  type: "checkout" | "checkin" | "transfer"
  user: string
  fromLocation: string | null
  toLocation: string | null
  notes: string | null
}

interface ToolTask {
  id: string
  title: string
  status: "open" | "in_progress" | "completed"
  assignedTo: string | null
  dueDate: string | null
}

interface MaintenanceEntry {
  id: string
  date: string
  type: string
  performedBy: string
  notes: string | null
  nextDue: string | null
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_TOOL = {
  id: "1",
  number: "WZ-001",
  name: "Bohrmaschine Hilti TE 6-A22",
  image: null,
  group: { id: "1", name: "Elektrowerkzeuge", color: "#3b82f6" },
  homeLocation: "Hauptlager",
  homeLocationId: "loc-1",
  assignedTo: null as string | null,
  assignedToId: null as string | null,
  assignedLocation: null as string | null,
  isHome: true,
  condition: "good" as ToolCondition,
  barcode: "4058546345679",
  manufacturer: "Hilti",
  manufacturerNumber: "TE 6-A22",
  serialNumber: "SN-2024-00456",
  maintenanceIntervalDays: 180,
  lastMaintenance: "2025-12-01",
  nextMaintenance: "2026-06-01",
  notes: "Akku-Bohrhammer, 22V Lithium-Ionen",
  createdAt: "2024-06-15",
}

const MOCK_BOOKINGS: ToolBooking[] = [
  {
    id: "b1",
    date: "2026-03-10T08:30:00",
    type: "checkin",
    user: "Max Müller",
    fromLocation: "Baustelle Zürich",
    toLocation: "Hauptlager",
    notes: null,
  },
  {
    id: "b2",
    date: "2026-03-03T07:15:00",
    type: "checkout",
    user: "Max Müller",
    fromLocation: "Hauptlager",
    toLocation: "Baustelle Zürich",
    notes: "Projekt Neubau Seestrasse",
  },
  {
    id: "b3",
    date: "2026-02-20T16:00:00",
    type: "checkin",
    user: "Anna Schmid",
    fromLocation: "Baustelle Bern",
    toLocation: "Hauptlager",
    notes: null,
  },
  {
    id: "b4",
    date: "2026-02-14T06:45:00",
    type: "checkout",
    user: "Anna Schmid",
    fromLocation: "Hauptlager",
    toLocation: "Baustelle Bern",
    notes: null,
  },
  {
    id: "b5",
    date: "2026-01-28T09:00:00",
    type: "transfer",
    user: "Peter Weber",
    fromLocation: "Fahrzeug 1",
    toLocation: "Hauptlager",
    notes: "Rücktransfer nach Wartung",
  },
]

const MOCK_TASKS: ToolTask[] = [
  {
    id: "t1",
    title: "Akkus prüfen und laden",
    status: "open",
    assignedTo: "Max Müller",
    dueDate: "2026-03-20",
  },
  {
    id: "t2",
    title: "Bohrfutter reinigen",
    status: "completed",
    assignedTo: "Anna Schmid",
    dueDate: "2026-02-15",
  },
]

const MOCK_MAINTENANCE: MaintenanceEntry[] = [
  {
    id: "m1",
    date: "2025-12-01",
    type: "Regelmässige Wartung",
    performedBy: "Peter Weber",
    notes: "Alle Teile in Ordnung, Akku getauscht",
    nextDue: "2026-06-01",
  },
  {
    id: "m2",
    date: "2025-06-01",
    type: "Regelmässige Wartung",
    performedBy: "Peter Weber",
    notes: "Bohrfutter leichter Verschleiss, sonst ok",
    nextDue: "2025-12-01",
  },
  {
    id: "m3",
    date: "2024-12-01",
    type: "Ersteinsatzprüfung",
    performedBy: "Servicetech AG",
    notes: "Neugerät geprüft und freigegeben",
    nextDue: "2025-06-01",
  },
]

// ── Helpers ────────────────────────────────────────────────────────────
const conditionConfig: Record<
  ToolCondition,
  { label: string; className: string }
> = {
  good: {
    label: "Gut",
    className:
      "bg-secondary/10 text-secondary",
  },
  damaged: {
    label: "Beschädigt",
    className:
      "bg-primary/10 text-primary",
  },
  repair: {
    label: "Reparatur",
    className:
      "bg-destructive/10 text-destructive",
  },
  decommissioned: {
    label: "Ausgemustert",
    className:
      "bg-muted text-muted-foreground",
  },
}

const bookingTypeConfig: Record<
  string,
  { label: string; className: string }
> = {
  checkout: {
    label: "Ausgecheckt",
    className: "bg-primary/10 text-primary",
  },
  checkin: {
    label: "Eingecheckt",
    className: "bg-secondary/10 text-secondary",
  },
  transfer: {
    label: "Transfer",
    className: "bg-muted text-muted-foreground",
  },
}

const taskStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  open: {
    label: "Offen",
    className: "bg-primary/10 text-primary",
  },
  in_progress: {
    label: "In Bearbeitung",
    className: "bg-primary/10 text-primary",
  },
  completed: {
    label: "Erledigt",
    className: "bg-secondary/10 text-secondary",
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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Component ──────────────────────────────────────────────────────────
export default function ToolDetailPage() {
  const t = useTranslations("tools")
  const tc = useTranslations("common")
  const router = useRouter()
  const params = useParams()

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)

  // In production this would fetch from API using params.id
  const tool = MOCK_TOOL
  const cond = conditionConfig[tool.condition]
  const isMaintenanceOverdue =
    tool.nextMaintenance && new Date(tool.nextMaintenance) < new Date()

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/tools")}
        >
          <IconArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
            <Badge
              variant="outline"
              className={`border-transparent ${cond.className}`}
            >
              {cond.label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {tool.number} &middot; {tool.group.name}
          </p>
        </div>
      </div>

      {/* Status Card + Check-in/Check-out */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Current Status */}
            <div className="flex items-center gap-6">
              <div className="bg-muted flex size-16 items-center justify-center rounded-xl">
                {tool.image ? (
                  <img
                    src={tool.image}
                    alt={tool.name}
                    className="size-16 rounded-xl object-cover"
                  />
                ) : (
                  <IconTool className="text-muted-foreground size-8" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${
                      tool.isHome ? "bg-secondary" : "bg-destructive"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {tool.isHome ? (
                      <span className="text-secondary">
                        {t("isHome")} &mdash; {tool.homeLocation}
                      </span>
                    ) : (
                      <span className="text-destructive">
                        Ausgecheckt &mdash; {tool.assignedTo}
                      </span>
                    )}
                  </span>
                </div>
                {!tool.isHome && tool.assignedLocation && (
                  <p className="text-muted-foreground flex items-center gap-1 text-sm">
                    <IconMapPin className="size-3.5" />
                    {tool.assignedLocation}
                  </p>
                )}
                {isMaintenanceOverdue && (
                  <p className="flex items-center gap-1 text-sm font-medium text-destructive">
                    <IconAlertTriangle className="size-3.5" />
                    Wartung überfällig ({formatDate(tool.nextMaintenance)})
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {tool.isHome ? (
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setCheckoutOpen(true)}
                >
                  <IconLogout className="size-5" />
                  {t("checkOut")}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  onClick={() => setCheckinOpen(true)}
                >
                  <IconLogin className="size-5" />
                  {t("checkIn")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("tabs.bookingHistory")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("tabs.tasks")}</TabsTrigger>
          <TabsTrigger value="maintenance">Wartung</TabsTrigger>
          <TabsTrigger value="qr">QR-Code</TabsTrigger>
        </TabsList>

        {/* ── General Tab ────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabs.general")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("name")}</Label>
                  <Input defaultValue={tool.name} />
                </div>
                <div className="space-y-2">
                  <Label>{t("number")}</Label>
                  <Input defaultValue={tool.number ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>{t("group")}</Label>
                  <Select defaultValue={tool.group.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Elektrowerkzeuge</SelectItem>
                      <SelectItem value="2">Handwerkzeuge</SelectItem>
                      <SelectItem value="3">Messinstrumente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("home")}</Label>
                  <Select defaultValue={tool.homeLocationId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loc-1">Hauptlager</SelectItem>
                      <SelectItem value="loc-2">Fahrzeug 1</SelectItem>
                      <SelectItem value="loc-3">Fahrzeug 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="sm:col-span-2" />

                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input defaultValue={tool.barcode ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Hersteller</Label>
                  <Input defaultValue={tool.manufacturer ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Herstellernummer</Label>
                  <Input defaultValue={tool.manufacturerNumber ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Seriennummer</Label>
                  <Input defaultValue={tool.serialNumber ?? ""} />
                </div>

                <Separator className="sm:col-span-2" />

                <div className="space-y-2">
                  <Label>{t("condition")}</Label>
                  <Select defaultValue={tool.condition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Gut</SelectItem>
                      <SelectItem value="damaged">Beschädigt</SelectItem>
                      <SelectItem value="repair">Reparatur</SelectItem>
                      <SelectItem value="decommissioned">Ausgemustert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Wartungsintervall (Tage)</Label>
                  <Input
                    type="number"
                    defaultValue={tool.maintenanceIntervalDays ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notizen</Label>
                  <Textarea defaultValue={tool.notes ?? ""} rows={3} />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">{tc("cancel")}</Button>
                <Button>{tc("save")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Booking History Tab ────────────────────────────────── */}
        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabs.bookingHistory")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Timeline View */}
              <div className="divide-y">
                {MOCK_BOOKINGS.map((booking) => {
                  const bConfig = bookingTypeConfig[booking.type]
                  return (
                    <div
                      key={booking.id}
                      className="flex gap-4 px-6 py-4"
                    >
                      {/* Timeline Dot */}
                      <div className="flex flex-col items-center pt-1">
                        <div
                          className={`size-3 rounded-full ${
                            booking.type === "checkin"
                              ? "bg-secondary"
                              : booking.type === "checkout"
                                ? "bg-primary"
                                : "bg-muted-foreground"
                          }`}
                        />
                        <div className="bg-border mt-1 w-px flex-1" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`border-transparent text-xs ${bConfig?.className}`}
                          >
                            {bConfig?.label}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(booking.date)}
                          </span>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">{booking.user}</span>
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <IconMapPin className="size-3" />
                          {booking.fromLocation ?? "-"}
                          <span className="mx-1">&rarr;</span>
                          {booking.toLocation ?? "-"}
                        </p>
                        {booking.notes && (
                          <p className="text-muted-foreground text-xs italic">
                            {booking.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tasks Tab ──────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("tabs.tasks")}</CardTitle>
              <Button size="sm">
                <IconClipboardCheck className="size-4" />
                Aufgabe erstellen
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t("assignedTo")}</TableHead>
                    <TableHead>Fällig am</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_TASKS.map((task) => {
                    const ts = taskStatusConfig[task.status]
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`border-transparent ${ts?.className}`}
                          >
                            {ts?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.assignedTo ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(task.dueDate)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {MOCK_TASKS.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Keine Aufgaben vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance Tab ────────────────────────────────────── */}
        <TabsContent value="maintenance" className="mt-4 space-y-4">
          {/* Maintenance Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <IconCalendar className="text-muted-foreground mb-2 size-6" />
                <p className="text-muted-foreground text-xs">{t("lastMaintenance")}</p>
                <p className="text-lg font-semibold">
                  {formatDate(tool.lastMaintenance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <IconCalendar
                  className={`mb-2 size-6 ${
                    isMaintenanceOverdue
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
                <p className="text-muted-foreground text-xs">Nächste Wartung</p>
                <p
                  className={`text-lg font-semibold ${
                    isMaintenanceOverdue ? "text-destructive" : ""
                  }`}
                >
                  {formatDate(tool.nextMaintenance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <IconTool className="text-muted-foreground mb-2 size-6" />
                <p className="text-muted-foreground text-xs">Intervall</p>
                <p className="text-lg font-semibold">
                  {tool.maintenanceIntervalDays
                    ? `${tool.maintenanceIntervalDays} Tage`
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Maintenance History */}
          <Card>
            <CardHeader>
              <CardTitle>Wartungshistorie</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Art</TableHead>
                    <TableHead>Durchgeführt von</TableHead>
                    <TableHead>Notizen</TableHead>
                    <TableHead>Nächste fällig</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_MAINTENANCE.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{entry.type}</TableCell>
                      <TableCell>{entry.performedBy}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">
                        {entry.notes ?? "-"}
                      </TableCell>
                      <TableCell>{formatDate(entry.nextDue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── QR-Code Tab ────────────────────────────────────────── */}
        <TabsContent value="qr" className="mt-4">
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-sm text-muted-foreground font-mono text-center max-w-sm">
              QR-Code für schnelles Ein-/Auschecken. Am Werkzeug anbringen oder im Werkzeugkasten befestigen.
            </p>
            <QrCodeDisplay
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/dashboard/tools/${tool.id}`
                  : `/dashboard/tools/${tool.id}`
              }
              label={`${tool.number ?? ""} · ${tool.name}`}
              size={200}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Checkout Dialog ──────────────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("checkOut")}: {tool.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                <IconUser className="inline size-4" /> {t("assignedTo")}
              </Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Person auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="u1">Max Müller</SelectItem>
                  <SelectItem value="u2">Anna Schmid</SelectItem>
                  <SelectItem value="u3">Peter Weber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                <IconMapPin className="inline size-4" /> Ziel-Lagerort
              </Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Lagerort auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loc-2">Fahrzeug 1</SelectItem>
                  <SelectItem value="loc-3">Fahrzeug 2</SelectItem>
                  <SelectItem value="loc-4">Baustelle Zürich</SelectItem>
                  <SelectItem value="loc-5">Baustelle Bern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Textarea rows={2} placeholder="Bemerkung zur Ausbuchung..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setCheckoutOpen(false)}
            >
              <IconLogout className="size-4" />
              {t("checkOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Checkin Dialog ───────────────────────────────────────── */}
      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("checkIn")}: {tool.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Aktuell bei:</span>{" "}
                <span className="font-medium">{tool.assignedTo ?? "-"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Standort:</span>{" "}
                <span className="font-medium">{tool.assignedLocation ?? "-"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Zurück an:</span>{" "}
                <span className="font-medium">{tool.homeLocation}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("condition")}</Label>
              <Select defaultValue="good">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Gut</SelectItem>
                  <SelectItem value="damaged">Beschädigt</SelectItem>
                  <SelectItem value="repair">Reparatur nötig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Textarea rows={2} placeholder="Bemerkung zur Rückgabe..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={() => setCheckinOpen(false)}
            >
              <IconLogin className="size-4" />
              {t("checkIn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
