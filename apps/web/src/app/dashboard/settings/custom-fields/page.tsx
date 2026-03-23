"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconChevronUp,
  IconChevronDown,
  IconSettings2,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EntityType = "material" | "tool" | "key" | "location"
type FieldType = "text" | "number" | "date" | "select" | "boolean"

interface FieldDefinition {
  id: string
  entityType: EntityType
  name: string
  fieldType: FieldType
  options: string[] | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ENTITY_TYPES: EntityType[] = ["material", "tool", "key", "location"]
const FIELD_TYPES: FieldType[] = ["text", "number", "date", "select", "boolean"]

// ---------------------------------------------------------------------------
// Component: New/Edit Field Dialog
// ---------------------------------------------------------------------------
interface FieldDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    entityType: EntityType
    name: string
    fieldType: FieldType
    options: string[] | null
    sortOrder: number
  }) => Promise<void>
  initial?: FieldDefinition | null
  saving: boolean
  t: (key: string) => string
}

function FieldDialog({ open, onClose, onSave, initial, saving, t }: FieldDialogProps) {
  const [entityType, setEntityType] = useState<EntityType>(
    initial?.entityType ?? "material"
  )
  const [name, setName] = useState(initial?.name ?? "")
  const [fieldType, setFieldType] = useState<FieldType>(
    initial?.fieldType ?? "text"
  )
  const [optionsRaw, setOptionsRaw] = useState(
    initial?.options?.join("\n") ?? ""
  )
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) {
      setError(t("nameRequired"))
      return
    }
    const options =
      fieldType === "select"
        ? optionsRaw
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : null

    if (fieldType === "select" && (!options || options.length === 0)) {
      setError(t("minOneOption"))
      return
    }

    await onSave({
      entityType,
      name: name.trim(),
      fieldType,
      options,
      sortOrder: initial?.sortOrder ?? 0,
    })
  }

  const isEditing = !!initial

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editField") : t("createField")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("editFieldDesc")
              : t("createFieldDesc")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4 py-1">
          {/* Entity Type — only selectable when creating */}
          <div className="space-y-2">
            <Label>{t("entityType")}</Label>
            <Select
              value={entityType}
              onValueChange={(v) => setEntityType(v as EntityType)}
              disabled={isEditing}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((et) => (
                  <SelectItem key={et} value={et}>
                    {t(`entityTypes.${et}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                {t("entityTypeFixed")}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="field-name">{t("fieldName")}</Label>
            <Input
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("fieldNamePlaceholder")}
            />
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label>{t("fieldType")}</Label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as FieldType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft} value={ft}>
                    {t(`fieldTypes.${ft}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options — only for select type */}
          {fieldType === "select" && (
            <div className="space-y-2">
              <Label htmlFor="field-options">
                {t("options")}{" "}
                <span className="text-muted-foreground font-normal">
                  {t("optionsHint")}
                </span>
              </Label>
              <textarea
                id="field-options"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                placeholder={t("optionsPlaceholder")}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Component: Delete Confirm Dialog
// ---------------------------------------------------------------------------
function DeleteDialog({
  open,
  onClose,
  onConfirm,
  fieldName,
  deleting,
  t,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  fieldName: string
  deleting: boolean
  t: (key: string, values?: Record<string, string>) => string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteDesc", { name: fieldName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? t("deleting") : t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CustomFieldsSettingsPage() {
  const t = useTranslations("customFields")
  const [definitions, setDefinitions] = useState<FieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<FieldDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/custom-fields")
      if (res.ok) {
        const data = await res.json()
        setDefinitions(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Group by entity type
  const grouped = ENTITY_TYPES.reduce(
    (acc, et) => {
      acc[et] = definitions
        .filter((d) => d.entityType === et)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return acc
    },
    {} as Record<EntityType, FieldDefinition[]>
  )

  // Reorder within entity type
  const handleReorder = async (
    entityType: EntityType,
    id: string,
    direction: "up" | "down"
  ) => {
    const group = grouped[entityType]
    const idx = group.findIndex((d) => d.id === id)
    if (direction === "up" && idx === 0) return
    if (direction === "down" && idx === group.length - 1) return

    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    const current = group[idx]!
    const swap = group[swapIdx]!

    // Optimistic update
    setDefinitions((prev) =>
      prev.map((d) => {
        if (d.id === current.id) return { ...d, sortOrder: swap.sortOrder }
        if (d.id === swap.id) return { ...d, sortOrder: current.sortOrder }
        return d
      })
    )

    // Persist both
    await Promise.all([
      fetch(`/api/custom-fields/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swap.sortOrder }),
      }),
      fetch(`/api/custom-fields/${swap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      }),
    ])
  }

  const handleCreate = async (data: {
    entityType: EntityType
    name: string
    fieldType: FieldType
    options: string[] | null
    sortOrder: number
  }) => {
    setSaving(true)
    try {
      // Assign next sortOrder for this entity type
      const typeCount = definitions.filter(
        (d) => d.entityType === data.entityType
      ).length
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, sortOrder: typeCount }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setEditingField(null)
        await load()
      }
    } catch {
      // TODO: error toast
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: {
    entityType: EntityType
    name: string
    fieldType: FieldType
    options: string[] | null
    sortOrder: number
  }) => {
    if (!editingField) return
    setSaving(true)
    try {
      const res = await fetch(`/api/custom-fields/${editingField.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          fieldType: data.fieldType,
          options: data.options,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setEditingField(null)
        await load()
      }
    } catch {
      // TODO: error toast
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/custom-fields/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeleteTarget(null)
        await load()
      }
    } catch {
      // TODO: error toast
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("description")}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingField(null)
            setDialogOpen(true)
          }}
        >
          <IconPlus className="size-4" />
          {t("newField")}
        </Button>
      </div>

      {/* Entity type groups */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {ENTITY_TYPES.map((et) => {
            const group = grouped[et]
            return (
              <Card key={et}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <IconSettings2 className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {t(`entityTypes.${et}`)}
                    </CardTitle>
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {group.length}
                    </Badge>
                  </div>
                  <CardDescription>
                    {t("fieldsShown", { entity: et === "location" ? t("entityTypes.location") : t(`entityTypes.${et}`) })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {group.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t("noFieldsYet")}
                    </p>
                  ) : (
                    <div className="divide-y rounded-md border">
                      {group.map((def, idx) => (
                        <div
                          key={def.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              onClick={() => handleReorder(et, def.id, "up")}
                              disabled={idx === 0}
                              aria-label={t("moveUp")}
                            >
                              <IconChevronUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              onClick={() => handleReorder(et, def.id, "down")}
                              disabled={idx === group.length - 1}
                              aria-label={t("moveDown")}
                            >
                              <IconChevronDown className="size-3.5" />
                            </button>
                          </div>

                          {/* Field info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {def.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-xs py-0 px-1.5 h-4"
                              >
                                {t(`fieldTypes.${def.fieldType}`)}
                              </Badge>
                              {def.fieldType === "select" &&
                                def.options &&
                                def.options.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {def.options.slice(0, 3).join(", ")}
                                    {def.options.length > 3
                                      ? ` +${def.options.length - 3}`
                                      : ""}
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingField(def)
                                setDialogOpen(true)
                              }}
                              aria-label={t("editLabel")}
                            >
                              <IconEdit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(def)}
                              aria-label={t("deleteLabel")}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <FieldDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingField(null)
        }}
        onSave={editingField ? handleEdit : handleCreate}
        initial={editingField}
        saving={saving}
        t={t}
      />

      {/* Delete Confirm Dialog */}
      <DeleteDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        fieldName={deleteTarget?.name ?? ""}
        deleting={deleting}
        t={t}
      />
    </div>
  )
}
