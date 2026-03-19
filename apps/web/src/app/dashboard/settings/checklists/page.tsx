"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconDeviceFloppy,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import type { ChecklistItem } from "@/lib/checklist"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolGroup {
  id: string
  name: string
  color: string | null
  pickupChecklist: ChecklistItem[] | null
  returnChecklist: ChecklistItem[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function newItem(): ChecklistItem {
  return { id: crypto.randomUUID(), label: "", required: false }
}

// ── Checklist editor sub-component ───────────────────────────────────────────

interface ChecklistEditorProps {
  title: string
  description: string
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  preview: boolean
}

function ChecklistEditor({
  title,
  description,
  items,
  onChange,
  preview,
}: ChecklistEditorProps) {
  const addItem = () => onChange([...items, newItem()])

  const removeItem = (id: string) =>
    onChange(items.filter((i) => i.id !== id))

  const updateItem = (id: string, patch: Partial<ChecklistItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const moveItem = (id: string, direction: "up" | "down") => {
    const idx = items.findIndex((i) => i.id === id)
    if (idx < 0) return
    const next = direction === "up" ? idx - 1 : idx + 1
    if (next < 0 || next >= items.length) return
    const arr = [...items]
    ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
    onChange(arr)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {preview ? (
        // ── Preview mode ──
        items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Keine Punkte definiert.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="size-4 rounded border border-input flex items-center justify-center shrink-0">
                  {/* empty checkbox preview */}
                </div>
                <span className="flex-1 text-sm">{item.label || "(leer)"}</span>
                {item.required && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-destructive/40 text-destructive shrink-0"
                  >
                    Pflicht
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // ── Edit mode ──
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              Noch keine Punkte. Klicke auf &bdquo;Punkt hinzufügen&rdquo;.
            </p>
          ) : (
            <div className="rounded-lg border divide-y">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                  {/* Drag handle (visual only) */}
                  <IconGripVertical className="size-4 text-muted-foreground/40 shrink-0 cursor-grab" />

                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, "up")}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Nach oben"
                    >
                      <IconChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, "down")}
                      disabled={idx === items.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Nach unten"
                    >
                      <IconChevronDown className="size-3" />
                    </button>
                  </div>

                  {/* Label input */}
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="Beschreibung des Prüfpunkts..."
                    value={item.label}
                    onChange={(e) =>
                      updateItem(item.id, { label: e.target.value })
                    }
                  />

                  {/* Required toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Checkbox
                      id={`req-${item.id}`}
                      checked={item.required}
                      onCheckedChange={(c) =>
                        updateItem(item.id, { required: c === true })
                      }
                    />
                    <Label
                      htmlFor={`req-${item.id}`}
                      className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                    >
                      Pflicht
                    </Label>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Punkt entfernen"
                  >
                    <IconTrash className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full"
          >
            <IconPlus className="size-4" />
            Punkt hinzufügen
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Tool group card ───────────────────────────────────────────────────────────

interface GroupCardProps {
  group: ToolGroup
  onSave: (
    id: string,
    pickupChecklist: ChecklistItem[],
    returnChecklist: ChecklistItem[]
  ) => Promise<void>
}

function GroupCard({ group, onSave }: GroupCardProps) {
  const [pickup, setPickup] = useState<ChecklistItem[]>(
    group.pickupChecklist ?? []
  )
  const [ret, setRet] = useState<ChecklistItem[]>(
    group.returnChecklist ?? []
  )
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty =
    JSON.stringify(pickup) !== JSON.stringify(group.pickupChecklist ?? []) ||
    JSON.stringify(ret) !== JSON.stringify(group.returnChecklist ?? [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(group.id, pickup, ret)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const dotStyle = group.color
    ? { backgroundColor: group.color }
    : undefined

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {group.color && (
              <span
                className="size-3 rounded-full shrink-0 ring-1 ring-border"
                style={dotStyle}
              />
            )}
            <CardTitle className="text-base">{group.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {pickup.length + ret.length} Punkte
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreview((v) => !v)}
              className="text-muted-foreground"
            >
              <IconEye className="size-4" />
              {preview ? "Bearbeiten" : "Vorschau"}
            </Button>

            {isDirty && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : saved ? (
                  <IconCheck className="size-4" />
                ) : (
                  <IconDeviceFloppy className="size-4" />
                )}
                {saving ? "Speichert…" : saved ? "Gespeichert" : "Speichern"}
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Prüflisten werden beim Auschecken (Abholung) und Einchecken (Rückgabe) angezeigt.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <ChecklistEditor
          title="Abholungs-Checkliste (Ausbuchung)"
          description="Wird angezeigt, wenn das Werkzeug ausgecheckt wird."
          items={pickup}
          onChange={setPickup}
          preview={preview}
        />

        <Separator />

        <ChecklistEditor
          title="Rückgabe-Checkliste (Einbuchung)"
          description="Wird angezeigt, wenn das Werkzeug zurückgegeben wird."
          items={ret}
          onChange={setRet}
          preview={preview}
        />
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChecklistsSettingsPage() {
  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/tool-groups")
      if (!res.ok) throw new Error("Laden fehlgeschlagen")
      const data = await res.json()
      setGroups(Array.isArray(data) ? data : [])
    } catch {
      setError("Werkzeuggruppen konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchGroups()
  }, [fetchGroups])

  const handleSave = useCallback(
    async (
      id: string,
      pickupChecklist: ChecklistItem[],
      returnChecklist: ChecklistItem[]
    ) => {
      const res = await fetch(`/api/tool-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupChecklist, returnChecklist }),
      })
      if (!res.ok) {
        throw new Error("Speichern fehlgeschlagen")
      }
      // Update local state so the dirty-check reflects saved state
      const updated: ToolGroup = await res.json()
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...g,
                pickupChecklist: updated.pickupChecklist,
                returnChecklist: updated.returnChecklist,
              }
            : g
        )
      )
    },
    []
  )

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wartungs-Checklisten</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Definiere Prüflisten pro Werkzeuggruppe. Diese werden beim Auschecken und
          Einchecken von Werkzeugen angezeigt.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Keine Werkzeuggruppen gefunden. Lege zuerst Gruppen unter{" "}
              <a
                href="/dashboard/master/tool-groups"
                className="text-primary underline underline-offset-2"
              >
                Stammdaten &rsaquo; Werkzeuggruppen
              </a>{" "}
              an.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  )
}
