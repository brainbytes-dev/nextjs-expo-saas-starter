"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { ChecklistResult } from "@/lib/checklist"

interface ChecklistStepProps {
  title: string
  results: ChecklistResult[]
  onChange: (results: ChecklistResult[]) => void
}

/**
 * Renders an interactive checklist during tool checkout / checkin.
 * Required items are marked with a badge; they must be checked before the
 * parent dialog can proceed.
 */
export function ChecklistStep({ title, results, onChange }: ChecklistStepProps) {
  const update = (id: string, patch: Partial<ChecklistResult>) => {
    onChange(results.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="rounded-lg border divide-y">
        {results.map((item) => (
          <div key={item.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id={`cl-${item.id}`}
                checked={item.checked}
                onCheckedChange={(checked) =>
                  update(item.id, { checked: checked === true })
                }
              />
              <Label
                htmlFor={`cl-${item.id}`}
                className={`flex-1 cursor-pointer text-sm leading-snug ${
                  item.checked ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.label}
              </Label>
              {item.required && !item.checked && (
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] border-destructive/40 text-destructive"
                >
                  Pflicht
                </Badge>
              )}
              {item.required && item.checked && (
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] border-secondary/40 text-secondary"
                >
                  OK
                </Badge>
              )}
            </div>
            {item.checked && (
              <input
                type="text"
                placeholder="Notiz (optional)..."
                value={item.notes ?? ""}
                onChange={(e) => update(item.id, { notes: e.target.value })}
                className="ml-7 mt-0.5 w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
