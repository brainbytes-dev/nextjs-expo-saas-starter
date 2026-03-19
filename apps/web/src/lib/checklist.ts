// ─── Checklist Types & Helpers ──────────────────────────────────────────────

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

export interface ChecklistResult {
  id: string
  label: string
  required: boolean
  checked: boolean
  notes?: string
}

/**
 * Returns true if all required items in the result are checked.
 */
export function isChecklistComplete(results: ChecklistResult[]): boolean {
  return results.every((item) => !item.required || item.checked)
}

/**
 * Converts a checklist definition into an initial (all unchecked) result array.
 */
export function initChecklistResults(items: ChecklistItem[]): ChecklistResult[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    required: item.required,
    checked: false,
    notes: undefined,
  }))
}
