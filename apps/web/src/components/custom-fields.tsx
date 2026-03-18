"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconDeviceFloppy, IconEdit, IconX } from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FieldType = "text" | "number" | "date" | "select" | "boolean"

interface FieldDefinition {
  id: string
  name: string
  fieldType: FieldType
  options: string[] | null
  sortOrder: number
}

interface FieldValue {
  id: string
  definitionId: string
  entityId: string
  value: string | null
  fieldName: string
  fieldType: FieldType
  sortOrder: number
  options: string[] | null
}

interface MergedField {
  definitionId: string
  name: string
  fieldType: FieldType
  options: string[] | null
  value: string | null
}

interface CustomFieldsSectionProps {
  entityType: "material" | "tool" | "key" | "location"
  entityId: string
}

// ---------------------------------------------------------------------------
// Individual field input renderer
// ---------------------------------------------------------------------------
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: MergedField
  value: string
  onChange: (val: string) => void
}) {
  switch (field.fieldType) {
    case "boolean":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={field.definitionId}
            checked={value === "true"}
            onCheckedChange={(checked) =>
              onChange(checked ? "true" : "false")
            }
          />
          <label
            htmlFor={field.definitionId}
            className="text-sm cursor-pointer select-none"
          >
            {field.name}
          </label>
        </div>
      )

    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      )

    case "date":
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case "select":
      return (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auswählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Keine Auswahl —</SelectItem>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.name}
        />
      )
  }
}

// ---------------------------------------------------------------------------
// View-mode value renderer
// ---------------------------------------------------------------------------
function FieldView({ field }: { field: MergedField }) {
  if (!field.value) return <span className="text-sm text-muted-foreground">&mdash;</span>

  switch (field.fieldType) {
    case "boolean":
      return (
        <span className="text-sm">
          {field.value === "true" ? "Ja" : "Nein"}
        </span>
      )
    case "date":
      return (
        <span className="text-sm">
          {new Date(field.value).toLocaleDateString("de-CH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      )
    default:
      return <span className="text-sm">{field.value === "_none" ? "\u2014" : field.value}</span>
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CustomFieldsSection({
  entityType,
  entityId,
}: CustomFieldsSectionProps) {
  const [definitions, setDefinitions] = useState<FieldDefinition[]>([])
  const [values, setValues] = useState<FieldValue[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [defsRes, valsRes] = await Promise.all([
        fetch(`/api/custom-fields?entityType=${entityType}`),
        fetch(`/api/custom-fields/values?entityId=${entityId}`),
      ])

      if (defsRes.ok) {
        const defs = await defsRes.json()
        setDefinitions(Array.isArray(defs) ? defs : [])
      }
      if (valsRes.ok) {
        const vals = await valsRes.json()
        setValues(Array.isArray(vals) ? vals : [])
      }
    } catch {
      // silently fail — custom fields are non-critical
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    load()
  }, [load])

  // Build merged field list: definitions as base, overlay with saved values
  const mergedFields: MergedField[] = definitions.map((def) => {
    const saved = values.find((v) => v.definitionId === def.id)
    return {
      definitionId: def.id,
      name: def.name,
      fieldType: def.fieldType,
      options: def.options,
      value: saved?.value ?? null,
    }
  })

  // Enter edit mode: seed editValues from current mergedFields
  const startEditing = () => {
    const seed: Record<string, string> = {}
    for (const f of mergedFields) {
      seed[f.definitionId] = f.value ?? ""
    }
    setEditValues(seed)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditValues({})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fields = definitions.map((def) => ({
        definitionId: def.id,
        value: editValues[def.id] ?? null,
      }))

      const res = await fetch("/api/custom-fields/values", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, fields }),
      })

      if (res.ok) {
        await load()
        setIsEditing(false)
        setEditValues({})
      }
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false)
    }
  }

  // Don't render if there are no definitions
  if (!loading && definitions.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">
          Zusatzfelder
        </CardTitle>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                <IconX className="size-4" />
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <IconDeviceFloppy className="size-4" />
                {saving ? "Speichern..." : "Speichern"}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={startEditing}
            >
              <IconEdit className="size-4" />
              Bearbeiten
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mergedFields.map((field) => (
              <div key={field.definitionId} className="space-y-1.5">
                {/* For boolean fields in view mode, skip the label (it's inline) */}
                {!(field.fieldType === "boolean" && isEditing) && (
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {field.name}
                  </Label>
                )}
                {isEditing ? (
                  <FieldInput
                    field={field}
                    value={editValues[field.definitionId] ?? ""}
                    onChange={(val) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [field.definitionId]: val,
                      }))
                    }
                  />
                ) : (
                  <FieldView field={field} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
