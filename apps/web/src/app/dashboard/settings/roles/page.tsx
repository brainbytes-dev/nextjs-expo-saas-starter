"use client"

import { useTranslations } from "next-intl"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  IconShield,
  IconShieldPlus,
  IconTrash,
  IconEdit,
  IconLock,
} from "@tabler/icons-react"

// ── Types ──────────────────────────────────────────────────────────────────

type Resource =
  | "materials" | "tools" | "keys" | "locations" | "commissions"
  | "orders" | "suppliers" | "customers" | "reports" | "settings"
  | "team" | "integrations"

type Action = "read" | "create" | "update" | "delete"
type PermissionMap = Record<Resource, Record<Action, boolean>>

interface Role {
  id: string; name: string; slug: string; isSystem: boolean; createdAt: string; permissions?: PermissionMap
}

interface OrgInfo { id: string; name: string; role: string | null }

// ── Constants ──────────────────────────────────────────────────────────────

const RESOURCES: Resource[] = [
  "materials", "tools", "keys", "locations", "commissions",
  "orders", "suppliers", "customers", "reports", "settings", "team", "integrations",
]

const ACTIONS: Action[] = ["read", "create", "update", "delete"]

const RESOURCE_LABEL_KEYS: Record<Resource, string> = {
  materials: "resMatLbl", tools: "resToolsLbl", keys: "resKeysLbl",
  locations: "resLocLbl", commissions: "resCommLbl", orders: "resOrdLbl",
  suppliers: "resSupLbl", customers: "resCustLbl", reports: "resRepLbl",
  settings: "resSetLbl", team: "resTeamLbl", integrations: "resIntLbl",
}

const ACTION_LABEL_KEYS: Record<Action, string> = {
  read: "actRead", create: "actCreate", update: "actUpdate", delete: "actDelete",
}

const LOCKED_ROLE_SLUGS = new Set(["inhaber", "administrator"])

// ── Helpers ────────────────────────────────────────────────────────────────

function emptyPermMap(): PermissionMap {
  const map = {} as PermissionMap
  for (const r of RESOURCES) {
    map[r] = {} as Record<Action, boolean>
    for (const a of ACTIONS) map[r][a] = false
  }
  return map
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Permission Matrix Component ─────────────────────────────────────────────

function PermissionMatrix({ permMap, onChange, readonly = false }: { permMap: PermissionMap; onChange: (map: PermissionMap) => void; readonly?: boolean }) {
  const ts = useTranslations("settings")

  const toggle = (resource: Resource, action: Action) => {
    if (readonly) return
    const updated = { ...permMap, [resource]: { ...permMap[resource], [action]: !permMap[resource][action] } }
    onChange(updated)
  }

  const toggleRow = (resource: Resource) => {
    if (readonly) return
    const allChecked = ACTIONS.every((a) => permMap[resource][a])
    const updated = { ...permMap, [resource]: Object.fromEntries(ACTIONS.map((a) => [a, !allChecked])) as Record<Action, boolean> }
    onChange(updated)
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40 min-w-[140px]">{ts("resource")}</TableHead>
            {ACTIONS.map((a) => (
              <TableHead key={a} className="w-24 text-center text-xs">{ts(ACTION_LABEL_KEYS[a] as any)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {RESOURCES.map((resource) => (
            <TableRow key={resource} className="group">
              <TableCell className="font-medium text-sm">
                <button
                  type="button"
                  className="flex items-center gap-1.5 hover:text-foreground text-muted-foreground transition-colors disabled:pointer-events-none"
                  onClick={() => toggleRow(resource)}
                  disabled={readonly}
                  title={ts("roleToggleAll", { resource: ts(RESOURCE_LABEL_KEYS[resource] as any) })}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  {ts(RESOURCE_LABEL_KEYS[resource] as any)}
                </button>
              </TableCell>
              {ACTIONS.map((action) => (
                <TableCell key={action} className="text-center">
                  <Checkbox
                    checked={permMap[resource]?.[action] ?? false}
                    onCheckedChange={() => toggle(resource, action)}
                    disabled={readonly}
                    aria-label={`${ts(RESOURCE_LABEL_KEYS[resource] as any)} ${ts(ACTION_LABEL_KEYS[action] as any)}`}
                    className="mx-auto"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function RolesPage() {
  const ts = useTranslations("settings")
  const tc = useTranslations("common")
  useSession()

  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [rolesList, setRolesList] = useState<Role[]>([])
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRolePerms, setNewRolePerms] = useState<PermissionMap>(emptyPermMap())
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editRole, setEditRole] = useState<Role | null>(null)
  const [editPerms, setEditPerms] = useState<PermissionMap>(emptyPermMap())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch("/api/organizations")
        if (!res.ok) throw new Error(ts("roleOrgLoadError"))
        const orgs: OrgInfo[] = await res.json()
        if (orgs.length > 0) setOrg(orgs[0]!)
      } catch (err) {
        setError(err instanceof Error ? err.message : ts("roleLoadError"))
      } finally {
        setIsLoadingOrg(false)
      }
    }
    loadOrg()
  }, [ts])

  const fetchRoles = useCallback(async (orgId: string) => {
    setIsLoadingRoles(true)
    try {
      const res = await fetch(`/api/roles?orgId=${orgId}`)
      if (!res.ok) throw new Error(ts("rolesLoadError"))
      const data: Role[] = await res.json()
      setRolesList(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : ts("rolesLoadFailed"))
    } finally {
      setIsLoadingRoles(false)
    }
  }, [ts])

  useEffect(() => { if (org?.id) fetchRoles(org.id) }, [org?.id, fetchRoles])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return
    setCreateError(null)
    setIsCreating(true)
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-organization-id": org.id },
        body: JSON.stringify({ name: newRoleName, permissions: newRolePerms }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error ?? ts("roleCreateFailed")); return }
      setCreateOpen(false)
      setNewRoleName("")
      setNewRolePerms(emptyPermMap())
      await fetchRoles(org.id)
    } catch {
      setCreateError(ts("roleNetworkError"))
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateDialogChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) { setNewRoleName(""); setNewRolePerms(emptyPermMap()); setCreateError(null) }
  }

  const openEdit = async (role: Role) => {
    if (!org) return
    setSaveError(null)
    setEditRole(role)
    const res = await fetch(`/api/roles/${role.id}?orgId=${org.id}`)
    if (res.ok) {
      const data = await res.json()
      setEditPerms(data.permissions ?? emptyPermMap())
    } else {
      setEditPerms(emptyPermMap())
    }
  }

  const handleSave = async () => {
    if (!editRole || !org) return
    setSaveError(null)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/roles/${editRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-organization-id": org.id },
        body: JSON.stringify({ permissions: editPerms }),
      })
      const json = await res.json()
      if (!res.ok) { setSaveError(json.error ?? ts("roleSaveFailed")); return }
      setEditRole(null)
      await fetchRoles(org.id)
    } catch {
      setSaveError(ts("roleNetworkError"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (!org || !window.confirm(ts("roleDeleteConfirm", { name: role.name }))) return
    setDeletingId(role.id)
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE", headers: { "x-organization-id": org.id } })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? ts("roleDeleteFailed"))
        return
      }
      setRolesList((prev) => prev.filter((r) => r.id !== role.id))
    } catch {
      setError(ts("roleNetworkDeleteError"))
    } finally {
      setDeletingId(null)
    }
  }

  const canManageRoles = org?.role === "owner" || org?.role === "admin"

  if (isLoadingOrg) {
    return (
      <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="px-4 py-8 md:px-6 lg:px-8">
        <p className="text-muted-foreground text-sm">{ts("noOrgFound")}</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">{ts("rolesSettings")}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{ts("rolesPageTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{ts("rolesDesc", { org: org.name })}</p>
          </div>
          {canManageRoles && (
            <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0"><IconShieldPlus className="mr-2 size-4" />{ts("newRole")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{ts("createCustomRole")}</DialogTitle>
                  <DialogDescription>{ts("roleCreateDialogDesc")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">{ts("roleNameLabel")}</Label>
                    <Input id="role-name" placeholder={ts("roleNamePlaceholder")} value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} disabled={isCreating} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{ts("permissionsLabel")}</Label>
                    <div className="rounded-md border"><PermissionMatrix permMap={newRolePerms} onChange={setNewRolePerms} /></div>
                  </div>
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleCreateDialogChange(false)} disabled={isCreating}>{ts("roleCreateCancel")}</Button>
                    <Button type="submit" disabled={isCreating || !newRoleName.trim()}>{isCreating ? ts("creating") : ts("createReport")}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconShield className="size-4" />{ts("roles")}
              {rolesList.length > 0 && <Badge variant="secondary" className="ml-1">{rolesList.length}</Badge>}
            </CardTitle>
            <CardDescription>{ts("systemRolesReadonly")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingRoles ? (
              <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : rolesList.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">{ts("noRolesYet")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ts("roles")}</TableHead>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead>{tc("created")}</TableHead>
                    {canManageRoles && <TableHead className="w-24 text-right" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesList.map((role) => {
                    const isLocked = LOCKED_ROLE_SLUGS.has(role.slug)
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isLocked && (
                              <Tooltip>
                                <TooltipTrigger asChild><IconLock className="size-3.5 text-muted-foreground shrink-0" /></TooltipTrigger>
                                <TooltipContent>{ts("roleSystemLocked")}</TooltipContent>
                              </Tooltip>
                            )}
                            {role.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? <Badge variant="secondary" className="text-xs">System</Badge> : <Badge variant="outline" className="text-xs">{ts("custom")}</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(role.createdAt)}</TableCell>
                        {canManageRoles && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(role)}><IconEdit className="size-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>{ts("roleEditView")}</TooltipContent>
                              </Tooltip>
                              {!role.isSystem && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" disabled={deletingId === role.id} onClick={() => handleDelete(role)}><IconTrash className="size-4" /></Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{ts("roleDeleteTooltip")}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {editRole && (
          <Dialog open={!!editRole} onOpenChange={(open) => { if (!open) setEditRole(null) }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {LOCKED_ROLE_SLUGS.has(editRole.slug) && <IconLock className="size-4 text-muted-foreground" />}
                  {editRole.name}
                </DialogTitle>
                <DialogDescription>
                  {LOCKED_ROLE_SLUGS.has(editRole.slug) ? ts("roleEditReadonly") : ts("roleEditDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border mt-2">
                <PermissionMatrix permMap={editPerms} onChange={setEditPerms} readonly={LOCKED_ROLE_SLUGS.has(editRole.slug)} />
              </div>
              {saveError && <p className="text-sm text-destructive mt-2">{saveError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditRole(null)} disabled={isSaving}>
                  {LOCKED_ROLE_SLUGS.has(editRole.slug) ? tc("close") : tc("cancel")}
                </Button>
                {!LOCKED_ROLE_SLUGS.has(editRole.slug) && (
                  <Button onClick={handleSave} disabled={isSaving}>{isSaving ? tc("loading") : tc("save")}</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}
