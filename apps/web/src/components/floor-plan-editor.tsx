"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FloorPlanMarker {
  id: string;
  entityType: "material" | "tool" | "key" | "location";
  entityId: string;
  x: number; // percentage 0–100
  y: number; // percentage 0–100
  label: string;
  stockLevel?: number;
  reorderLevel?: number;
  status?: "ok" | "low" | "empty";
}

interface FloorPlanEditorProps {
  imageUrl: string;
  markers: FloorPlanMarker[];
  readonly?: boolean;
  onMarkersChange?: (markers: FloorPlanMarker[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function markerColor(marker: FloorPlanMarker): {
  bg: string;
  border: string;
  ring: string;
} {
  const status = marker.status;
  if (status === "empty")
    return {
      bg: "bg-red-500",
      border: "border-red-600",
      ring: "ring-red-400/40",
    };
  if (status === "low")
    return {
      bg: "bg-yellow-500",
      border: "border-yellow-600",
      ring: "ring-yellow-400/40",
    };
  return {
    bg: "bg-green-500",
    border: "border-green-600",
    ring: "ring-green-400/40",
  };
}

function statusLabel(status: FloorPlanMarker["status"]): string {
  if (status === "empty") return "Leer";
  if (status === "low") return "Niedrig";
  return "OK";
}

function statusBadgeClass(status: FloorPlanMarker["status"]): string {
  if (status === "empty")
    return "border-red-500/30 text-red-600 bg-red-500/10";
  if (status === "low")
    return "border-yellow-500/30 text-yellow-600 bg-yellow-500/10";
  return "border-green-500/30 text-green-600 bg-green-500/10";
}

function entityTypeLabel(type: FloorPlanMarker["entityType"]): string {
  const map: Record<FloorPlanMarker["entityType"], string> = {
    material: "Material",
    tool: "Werkzeug",
    key: "Schlüssel",
    location: "Lagerort",
  };
  return map[type];
}

// ─── Marker Pin ───────────────────────────────────────────────────────────────

function MarkerPin({
  marker,
  selected,
  onClick,
}: {
  marker: FloorPlanMarker;
  selected: boolean;
  onClick: () => void;
}) {
  const { bg, border, ring } = markerColor(marker);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={[
        "absolute -translate-x-1/2 -translate-y-full",
        "flex flex-col items-center cursor-pointer group z-10",
        "focus:outline-none",
      ].join(" ")}
      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
      title={marker.label}
    >
      {/* Pin */}
      <div
        className={[
          "w-5 h-5 rounded-full border-2 shadow-md transition-all duration-150",
          bg,
          border,
          selected
            ? `ring-4 ${ring} scale-125`
            : `group-hover:scale-110 group-hover:ring-2 ${ring}`,
        ].join(" ")}
      />
      {/* Stem */}
      <div className={`w-0.5 h-2 ${bg} opacity-80`} />
      {/* Label */}
      <span
        className={[
          "absolute bottom-full mb-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap pointer-events-none",
          "bg-background/95 border border-border shadow-sm",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-150",
        ].join(" ")}
      >
        {marker.label}
      </span>
    </button>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function MarkerDetailModal({
  marker,
  onClose,
}: {
  marker: FloorPlanMarker | null;
  onClose: () => void;
}) {
  if (!marker) return null;

  return (
    <Dialog open={!!marker} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{marker.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-mono"
            >
              {entityTypeLabel(marker.entityType)}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${statusBadgeClass(marker.status)}`}
            >
              {statusLabel(marker.status)}
            </Badge>
          </div>

          {marker.stockLevel !== undefined && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Bestand
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold">{marker.stockLevel}</span>
                {marker.reorderLevel !== undefined && (
                  <span className="text-xs text-muted-foreground mb-1">
                    / Meldebestand: {marker.reorderLevel}
                  </span>
                )}
              </div>
              {/* Stock bar */}
              {marker.reorderLevel !== undefined && marker.reorderLevel > 0 && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      marker.status === "empty"
                        ? "bg-red-500"
                        : marker.status === "low"
                          ? "bg-yellow-500"
                          : "bg-green-500",
                    ].join(" ")}
                    style={{
                      width: `${Math.min(100, Math.round(((marker.stockLevel ?? 0) / (marker.reorderLevel * 2)) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground font-mono">
            ID: {marker.entityId}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function FloorPlanEditor({
  imageUrl,
  markers,
  readonly = false,
  onMarkersChange,
}: FloorPlanEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMarker, setSelectedMarker] = useState<FloorPlanMarker | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showDetail, setShowDetail] = useState<FloorPlanMarker | null>(null);

  // ── Click on image → place new marker ────────────────────────────────────
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readonly || draggingId) return;
      if ((e.target as HTMLElement).closest("[data-marker]")) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newMarker: FloorPlanMarker = {
        id: crypto.randomUUID(),
        entityType: "material",
        entityId: "",
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        label: "Neuer Marker",
        status: "ok",
      };

      onMarkersChange?.([...markers, newMarker]);
      setSelectedMarker(newMarker);
    },
    [readonly, draggingId, markers, onMarkersChange]
  );

  // ── Drag start ────────────────────────────────────────────────────────────
  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent, marker: FloorPlanMarker) => {
      if (readonly) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const markerX = (marker.x / 100) * rect.width + rect.left;
      const markerY = (marker.y / 100) * rect.height + rect.top;

      setDraggingId(marker.id);
      setDragOffset({
        x: e.clientX - markerX,
        y: e.clientY - markerY,
      });
    },
    [readonly]
  );

  // ── Drag move ─────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = Math.max(
        0,
        Math.min(100, ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100)
      );
      const y = Math.max(
        0,
        Math.min(100, ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100)
      );

      onMarkersChange?.(
        markers.map((m) =>
          m.id === draggingId
            ? { ...m, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
            : m
        )
      );
    },
    [draggingId, dragOffset, markers, onMarkersChange]
  );

  // ── Drag end ──────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const handleMarkerClick = (marker: FloorPlanMarker) => {
    setSelectedMarker((prev) => (prev?.id === marker.id ? null : marker));
    setShowDetail(marker);
  };

  const handleDeleteSelected = () => {
    if (!selectedMarker) return;
    onMarkersChange?.(markers.filter((m) => m.id !== selectedMarker.id));
    setSelectedMarker(null);
  };

  // ── Legend ────────────────────────────────────────────────────────────────
  const legendItems = [
    { color: "bg-green-500", label: "OK" },
    { color: "bg-yellow-500", label: "Niedrig" },
    { color: "bg-red-500", label: "Leer" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          {!readonly && (
            <div className="flex items-center gap-2">
              {selectedMarker && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                  onClick={handleDeleteSelected}
                >
                  Marker entfernen
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                Klicke auf das Bild, um einen Marker zu platzieren.
              </span>
            </div>
          )}
        </div>

        {/* Image canvas */}
        <div
          ref={containerRef}
          className={[
            "relative w-full overflow-hidden rounded-xl border border-border bg-muted/20",
            "select-none",
            !readonly ? "cursor-crosshair" : "cursor-default",
            draggingId ? "cursor-grabbing" : "",
          ].join(" ")}
          style={{ aspectRatio: "16/9" }}
          onClick={handleImageClick}
        >
          {/* Floor plan image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Grundriss"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* Markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              data-marker="true"
              onMouseDown={(e) => handleMarkerMouseDown(e, marker)}
              className={draggingId === marker.id ? "cursor-grabbing" : "cursor-grab"}
            >
              <MarkerPin
                marker={marker}
                selected={selectedMarker?.id === marker.id}
                onClick={() => handleMarkerClick(marker)}
              />
            </div>
          ))}

          {/* Empty state overlay */}
          {markers.length === 0 && !readonly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-1 bg-background/70 backdrop-blur-sm rounded-xl px-6 py-4 border border-border">
                <p className="text-sm font-medium">Keine Marker vorhanden</p>
                <p className="text-xs text-muted-foreground">
                  Klicke auf das Bild, um Positionen zu markieren.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Marker count */}
        <p className="text-xs text-muted-foreground font-mono">
          {markers.length} {markers.length === 1 ? "Marker" : "Marker"} gesetzt
        </p>
      </div>

      {/* Detail modal */}
      <MarkerDetailModal
        marker={showDetail}
        onClose={() => setShowDetail(null)}
      />
    </TooltipProvider>
  );
}
