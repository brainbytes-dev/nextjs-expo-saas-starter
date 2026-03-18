"use client"

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
import { Skeleton } from "@/components/ui/skeleton"
import { IconUserPlus, IconTrash, IconUsers } from "@tabler/icons-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface OrgMember {
  id: string
  userId: string
  role: string | null
  rbacRoleId: string | null
  createdAt: string
  userName: string | null
  userEmail: string
  userImage: string | null
}

interface OrgInfo {
  id: string
  name: string
  role: string | null
}

interface RbacRole {
  id: string
  name: string
  slug: string
  isSystem: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

const LEGACY_ROLE_LABELS: Record<string, string> = {
  owner: "Eigentümer",
  admin: "Admin",
  member: "Mitglied",
}

const LEGACY_ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ── Component ──────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: session } = useSession()

  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [rbacRoles, setRbacRoles] = useState<RbacRole[]>([])
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [inviteRbacRoleId, setInviteRbacRoleId] = useState<string>("")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Remove state
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Role assignment state: memberId → new rbacRoleId being saved
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null)

  // Fetch the user's first organization
  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch("/api/organizations")
        if (!res.ok) throw new Error("Organisations-Daten konnten nicht geladen werden")
        const orgs: OrgInfo[] = await res.json()
        if (orgs.length > 0) {
          setOrg(orgs[0]!)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Laden")
      } finally {
        setIsLoadingOrg(false)
      }
    }
    loadOrg()
  }, [])

  // Fetch RBAC roles once we have orgId
  const fetchRbacRoles = useCallback(async (orgId: string) => {
    try {
      const res = await fetch(`/api/roles?orgId=${orgId}`)
      if (res.ok) {
        const data: RbacRole[] = await res.json()
        setRbacRoles(data)
      }
    } catch {
      // Non-critical — RBAC roles just won't show in dropdown
    }
  }, [])

  // Fetch members once we have orgId
  const fetchMembers = useCallback(async (orgId: string) => {
    setIsLoadingMembers(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`)
      if (!res.ok) throw new Error("Mitglieder konnten nicht geladen werden")
      const data: OrgMember[] = await res.json()
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Mitglieder")
    } finally {
      setIsLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    if (org?.id) {
      void fetchMembers(org.id)
      void fetchRbacRoles(org.id)
    }
  }, [org?.id, fetchMembers, fetchRbacRoles])

  // ── Invite ────────────────────────────────────────────────────────────────

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return
    setInviteError(null)
    setInviteSuccess(null)
    setIsInviting(true)

    try {
      const res = await fetch(`/api/organizations/${org.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          rbacRoleId: inviteRbacRoleId || undefined,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setInviteError(json.error ?? "Einladung fehlgeschlagen")
        return
      }

      if (json.invited) {
        setInviteSuccess(`Einladungs-E-Mail wurde an ${inviteEmail} gesendet.`)
      } else {
        setInviteSuccess(`${inviteEmail} wurde dem Team hinzugefügt.`)
        fetchMembers(org.id)
      }

      setInviteEmail("")
      setInviteRole("member")
      setInviteRbacRoleId("")
    } catch {
      setInviteError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setInviteEmail("")
      setInviteRole("member")
      setInviteRbacRoleId("")
      setInviteError(null)
      setInviteSuccess(null)
    }
  }

  // ── RBAC Role Assignment ──────────────────────────────────────────────────

  const handleRbacRoleChange = async (memberId: string, rbacRoleId: string) => {
    if (!org) return
    setSavingRoleFor(memberId)
    try {
      const res = await fetch(`/api/organizations/${org.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rbacRoleId: rbacRoleId === "none" ? null : rbacRoleId }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "Rolle konnte nicht zugewiesen werden")
        return
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, rbacRoleId: rbacRoleId === "none" ? null : rbacRoleId }
            : m
        )
      )
    } catch {
      setError("Netzwerkfehler beim Zuweisen der Rolle")
    } finally {
      setSavingRoleFor(null)
    }
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  const handleRemove = async (memberId: string) => {
    if (!org) return
    setRemovingId(memberId)
    try {
      const res = await fetch(
        `/api/organizations/${org.id}/members/${memberId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "Mitglied konnte nicht entfernt werden")
        return
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch {
      setError("Netzwerkfehler beim Entfernen des Mitglieds")
    } finally {
      setRemovingId(null)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const currentUserMembership = members.find(
    (m) => m.userId === session?.user?.id
  )
  const canInvite =
    currentUserMembership?.role === "owner" ||
    currentUserMembership?.role === "admin"

  // ── Render ────────────────────────────────────────────────────────────────

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
        <p className="text-muted-foreground text-sm">
          Keine Organisation gefunden. Bitte erstelle zuerst eine Organisation.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Einstellungen
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte die Mitglieder von <strong>{org.name}</strong>.
          </p>
        </div>

        {canInvite && (
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <IconUserPlus className="mr-2 size-4" />
                Mitglied einladen
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Mitglied einladen</DialogTitle>
                <DialogDescription>
                  Gib die E-Mail-Adresse der Person ein, die du einladen möchtest.
                  Falls sie noch kein Konto hat, erhält sie einen Registrierungslink.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleInvite} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-Mail-Adresse</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@beispiel.ch"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">Organisationsrolle</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "admin" | "member")}
                    disabled={isInviting}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Mitglied</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Admins können Mitglieder einladen und verwalten.
                  </p>
                </div>

                {rbacRoles.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="invite-rbac-role">Berechtigungsrolle</Label>
                    <Select
                      value={inviteRbacRoleId || "none"}
                      onValueChange={setInviteRbacRoleId}
                      disabled={isInviting}
                    >
                      <SelectTrigger id="invite-rbac-role">
                        <SelectValue placeholder="Standardberechtigungen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Standardberechtigungen</SelectItem>
                        {rbacRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Legt fest, auf welche Bereiche die Person zugreifen darf.
                    </p>
                  </div>
                )}

                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}

                {inviteSuccess && (
                  <p className="text-sm text-green-600">{inviteSuccess}</p>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    disabled={isInviting}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={isInviting || !inviteEmail}>
                    {isInviting ? "Wird gesendet…" : "Einladung senden"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconUsers className="size-4" />
            Teammitglieder
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {members.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Alle Personen, die Zugang zu dieser Organisation haben.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingMembers ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Noch keine Mitglieder.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Org-Rolle</TableHead>
                  <TableHead>Berechtigungsrolle</TableHead>
                  <TableHead>Beigetreten</TableHead>
                  {canInvite && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isOwner = member.role === "owner"
                  const isSelf = member.userId === session?.user?.id
                  const legacyLabel =
                    LEGACY_ROLE_LABELS[member.role ?? "member"] ?? member.role
                  const legacyVariant =
                    LEGACY_ROLE_VARIANTS[member.role ?? "member"] ?? "outline"
                  const assignedRbacRole = rbacRoles.find(
                    (r) => r.id === member.rbacRoleId
                  )

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.userName ?? "—"}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(du)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.userEmail}
                      </TableCell>
                      <TableCell>
                        <Badge variant={legacyVariant}>{legacyLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        {canInvite && !isOwner && rbacRoles.length > 0 ? (
                          <Select
                            value={member.rbacRoleId ?? "none"}
                            onValueChange={(v) => handleRbacRoleChange(member.id, v)}
                            disabled={savingRoleFor === member.id}
                          >
                            <SelectTrigger className="h-7 text-xs w-40">
                              <SelectValue placeholder="Keine Rolle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Keine Rolle</span>
                              </SelectItem>
                              {rbacRoles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {assignedRbacRole?.name ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      {canInvite && (
                        <TableCell>
                          {!isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              disabled={removingId === member.id}
                              onClick={() => handleRemove(member.id)}
                              title="Mitglied entfernen"
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          )}
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
    </div>
  )
}
