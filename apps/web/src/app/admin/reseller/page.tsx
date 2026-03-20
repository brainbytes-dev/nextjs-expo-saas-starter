"use client"

import * as React from "react"
import {
  IconBrush,
  IconCheck,
  IconEdit,
  IconPlus,
  IconWorld,
  IconEye,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface Branding {
  id: string
  organizationId: string
  orgName: string
  orgSlug: string
  appName: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  accentColor: string | null
  customDomain: string | null
  hideLogistikAppBranding: boolean
  customFooterText: string | null
  createdAt: string
  updatedAt: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

const DEFAULT_FORM = {
  organizationId: "",
  appName: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#3b82f6",
  accentColor: "#10b981",
  customDomain: "",
  hideLogistikAppBranding: false,
  customFooterText: "",
}

export default function ResellerPage() {
  const [brandings, setBrandings] = React.useState<Branding[]>([])
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewBranding, setPreviewBranding] = React.useState<typeof DEFAULT_FORM | null>(null)
  const [form, setForm] = React.useState(DEFAULT_FORM)
  const [saving, setSaving] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      const [brandingRes, orgsRes] = await Promise.all([
        fetch("/api/admin/reseller"),
        fetch("/api/admin/organizations"),
      ])
      if (brandingRes.ok) {
        const data = await brandingRes.json()
        setBrandings(data.brandings ?? [])
      }
      if (orgsRes.ok) {
        const data = await orgsRes.json()
        setOrganizations(
          (data.organizations ?? []).map((o: Record<string, string>) => ({
            id: o.id,
            name: o.name,
            slug: o.slug,
          }))
        )
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEdit = (branding: Branding) => {
    setEditingId(branding.id)
    setForm({
      organizationId: branding.organizationId,
      appName: branding.appName ?? "",
      logoUrl: branding.logoUrl ?? "",
      faviconUrl: branding.faviconUrl ?? "",
      primaryColor: branding.primaryColor ?? "#3b82f6",
      accentColor: branding.accentColor ?? "#10b981",
      customDomain: branding.customDomain ?? "",
      hideLogistikAppBranding: branding.hideLogistikAppBranding,
      customFooterText: branding.customFooterText ?? "",
    })
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/reseller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setDialogOpen(false)
        fetchData()
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = (branding: Branding) => {
    setPreviewBranding({
      organizationId: branding.organizationId,
      appName: branding.appName ?? "",
      logoUrl: branding.logoUrl ?? "",
      faviconUrl: branding.faviconUrl ?? "",
      primaryColor: branding.primaryColor ?? "#3b82f6",
      accentColor: branding.accentColor ?? "#10b981",
      customDomain: branding.customDomain ?? "",
      hideLogistikAppBranding: branding.hideLogistikAppBranding,
      customFooterText: branding.customFooterText ?? "",
    })
    setPreviewOpen(true)
  }

  // Filter out orgs that already have branding (unless we're editing)
  const usedOrgIds = brandings.map((b) => b.organizationId)
  const availableOrgs = organizations.filter(
    (o) => !usedOrgIds.includes(o.id) || o.id === form.organizationId
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">White-Label Reseller</h2>
          <p className="text-muted-foreground">
            Verwalte Branding-Konfigurationen für Reseller-Organisationen
          </p>
        </div>
        <Button onClick={handleNew}>
          <IconPlus className="mr-2 size-4" />
          Neues Branding
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>App-Name</TableHead>
              <TableHead>Custom Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brandings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Noch keine Reseller-Brandings konfiguriert
                </TableCell>
              </TableRow>
            ) : (
              brandings.map((branding) => (
                <TableRow key={branding.id}>
                  <TableCell className="font-medium">{branding.orgName}</TableCell>
                  <TableCell>
                    {branding.appName ? (
                      <span className="flex items-center gap-2">
                        {branding.primaryColor && (
                          <span
                            className="inline-block size-3 rounded-full"
                            style={{ backgroundColor: branding.primaryColor }}
                          />
                        )}
                        {branding.appName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">LogistikApp</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {branding.customDomain ? (
                      <span className="flex items-center gap-1.5">
                        <IconWorld className="size-3.5 text-muted-foreground" />
                        {branding.customDomain}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {branding.hideLogistikAppBranding ? (
                      <Badge variant="default">White-Label</Badge>
                    ) : (
                      <Badge variant="secondary">Co-Branded</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(branding)}
                        title="Vorschau"
                      >
                        <IconEye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(branding)}
                        title="Bearbeiten"
                      >
                        <IconEdit className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Branding bearbeiten" : "Neues Reseller-Branding"}
            </DialogTitle>
            <DialogDescription>
              Konfiguriere das White-Label-Branding für eine Organisation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org">Organisation</Label>
              <Select
                value={form.organizationId}
                onValueChange={(v) => setForm((f) => ({ ...f, organizationId: v }))}
                disabled={!!editingId}
              >
                <SelectTrigger id="org">
                  <SelectValue placeholder="Organisation wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="appName">App-Name</Label>
              <Input
                id="appName"
                placeholder="z.B. BauLager Pro"
                value={form.appName}
                onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo-URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://..."
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon-URL</Label>
                <Input
                  id="faviconUrl"
                  placeholder="https://..."
                  value={form.faviconUrl}
                  onChange={(e) => setForm((f) => ({ ...f, faviconUrl: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primärfarbe</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Akzentfarbe</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={form.accentColor}
                    onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                placeholder="z.B. lager.meinfirma.ch"
                value={form.customDomain}
                onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customFooterText">Eigener Footer-Text</Label>
              <Input
                id="customFooterText"
                placeholder="z.B. © 2026 Meine Firma AG"
                value={form.customFooterText}
                onChange={(e) => setForm((f) => ({ ...f, customFooterText: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="hideBranding" className="text-sm font-medium">
                  LogistikApp-Branding ausblenden
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vollständiges White-Label ohne Hinweis auf LogistikApp
                </p>
              </div>
              <Switch
                id="hideBranding"
                checked={form.hideLogistikAppBranding}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, hideLogistikAppBranding: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.organizationId}
            >
              {saving ? (
                "Speichere..."
              ) : (
                <>
                  <IconCheck className="mr-2 size-4" />
                  Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <IconBrush className="mr-2 inline size-5" />
              Branding-Vorschau
            </DialogTitle>
          </DialogHeader>
          {previewBranding && (
            <Card className="overflow-hidden">
              <CardHeader
                className="pb-3"
                style={{ backgroundColor: previewBranding.primaryColor || "#3b82f6" }}
              >
                <div className="flex items-center gap-3">
                  {previewBranding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewBranding.logoUrl}
                      alt="Logo"
                      className="h-8 w-8 rounded object-contain bg-white/20 p-0.5"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20 text-white text-xs font-bold">
                      LA
                    </div>
                  )}
                  <CardTitle className="text-white text-lg">
                    {previewBranding.appName || "LogistikApp"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-4 rounded"
                    style={{ backgroundColor: previewBranding.primaryColor || "#3b82f6" }}
                  />
                  <span className="text-sm">Primärfarbe: {previewBranding.primaryColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-4 rounded"
                    style={{ backgroundColor: previewBranding.accentColor || "#10b981" }}
                  />
                  <span className="text-sm">Akzentfarbe: {previewBranding.accentColor}</span>
                </div>
                {previewBranding.customDomain && (
                  <div className="flex items-center gap-2 text-sm">
                    <IconWorld className="size-4 text-muted-foreground" />
                    {previewBranding.customDomain}
                  </div>
                )}
                <Separator />
                <p className="text-xs text-muted-foreground text-center">
                  {previewBranding.customFooterText ||
                    (previewBranding.hideLogistikAppBranding
                      ? previewBranding.appName || "White-Label"
                      : `Powered by LogistikApp`)}
                </p>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
