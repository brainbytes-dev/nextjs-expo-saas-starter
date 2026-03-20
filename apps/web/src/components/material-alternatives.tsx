"use client"

import { useState, useCallback } from "react"
import { IconLoader2, IconReplace, IconPackage, IconChevronRight } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Alternative {
  id: string
  name: string
  number: string | null
  unit: string | null
  groupName: string | null
  totalStock: number
}

interface MaterialAlternativesProps {
  materialId: string
  onSelect?: (materialId: string) => void
}

export function MaterialAlternatives({
  materialId,
  onSelect,
}: MaterialAlternativesProps) {
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [fetchedFor, setFetchedFor] = useState<string | null>(null)
  const [prevMaterialId, setPrevMaterialId] = useState(materialId)

  // Reset when materialId changes (React-recommended derived state pattern)
  if (prevMaterialId !== materialId) {
    setPrevMaterialId(materialId)
    setFetchedFor(null)
    setAlternatives([])
    setOpen(false)
  }

  const fetchAlternatives = useCallback(() => {
    if (fetchedFor === materialId) return
    setLoading(true)
    setFetchedFor(materialId)
    fetch(`/api/materials/${materialId}/alternatives`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAlternatives(Array.isArray(data) ? data : []))
      .catch(() => setAlternatives([]))
      .finally(() => setLoading(false))
  }, [materialId, fetchedFor])

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => { setOpen((prev) => !prev); fetchAlternatives() }}
      >
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <IconReplace className="size-4" />
          Alternativen
          <IconChevronRight
            className={`ml-auto size-4 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : alternatives.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Keine Alternativen gefunden
            </p>
          ) : (
            <div className="space-y-2">
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <IconPackage className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {alt.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alt.number ? `#${alt.number}` : "Ohne Nr."}
                      {alt.groupName ? ` · ${alt.groupName}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alt.totalStock > 0 ? "default" : "destructive"
                    }
                    className="shrink-0"
                  >
                    {alt.totalStock} {alt.unit ?? "Stk"}
                  </Badge>
                  {onSelect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(alt.id)
                      }}
                    >
                      Verwenden
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
