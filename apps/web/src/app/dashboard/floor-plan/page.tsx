"use client"

import { useTranslations } from "next-intl";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/hooks/use-organization";
import { FloorPlanEditor, type FloorPlanMarker } from "@/components/floor-plan-editor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloorPlan {
  id: string;
  name: string;
  locationId: string | null;
  locationName: string | null;
  imageUrl: string;
  items: FloorPlanMarker[] | null;
  createdAt: string;
  updatedAt: string;
}

interface LocationOption {
  id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

function CreateFloorPlanDialog({
  orgId,
  locations,
  onCreated,
}: {
  orgId: string;
  locations: LocationOption[];
  onCreated: (fp: FloorPlan) => void;
}) {
  const t = useTranslations("floorPlan");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [locationId, setLocationId] = useState<string>("__none__");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/floor-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          name,
          imageUrl,
          locationId: locationId === "__none__" ? null : locationId,
          items: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("createError"));
        return;
      }
      setOpen(false);
      setName("");
      setImageUrl("");
      setLocationId("__none__");
      onCreated(data as FloorPlan);
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("newFloorPlan")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fp-name">{t("name")}</Label>
            <Input
              id="fp-name"
              placeholder="z. B. Lager EG, Fahrzeug 01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-image">{t("imageUrlLabel")}</Label>
            <Input
              id="fp-image"
              placeholder="https://beispiel.ch/grundriss.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              {t("imageUrlHintText")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-location">{t("locationLabel")}</Label>
            <Select
              value={locationId}
              onValueChange={setLocationId}
              disabled={saving}
            >
              <SelectTrigger id="fp-location">
                <SelectValue placeholder={t("noLocationOption")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("noLocationOption")}</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !imageUrl.trim()}
          >
            {saving ? t("creatingAction") : t("createAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  fpName,
  onConfirm,
  loading,
}: {
  fpName: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  const t = useTranslations("floorPlan");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 text-destructive hover:text-destructive"
          disabled={loading}
        >
          {loading ? "..." : t("deleteAction")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            <strong>{fpName}</strong> {t("deleteDesc")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            disabled={loading}
          >
            {t("deleteAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FloorPlanPage() {
  const t = useTranslations("floorPlan")
  const { orgId } = useOrganization();
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FloorPlan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setPageError(null);
    try {
      const [fpRes, locRes] = await Promise.all([
        fetch("/api/floor-plans", { headers: { "x-organization-id": orgId } }),
        fetch("/api/locations", { headers: { "x-organization-id": orgId } }),
      ]);
      if (!fpRes.ok) throw new Error("t("loadError")");
      const fpJson = await fpRes.json();
      const locJson = locRes.ok ? await locRes.json() : { data: [] };
      setFloorPlans(fpJson.data ?? []);
      setLocations(
        (locJson.data ?? []).map((l: { id: string; name: string }) => ({
          id: l.id,
          name: l.name,
        }))
      );
    } catch (err) {
      setPageError(err instanceof Error ? err.message : t("loadingError"));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-save markers with debounce
  const handleMarkersChange = useCallback(
    (markers: FloorPlanMarker[]) => {
      if (!activePlan || !orgId) return;

      const updated = { ...activePlan, items: markers };
      setActivePlan(updated);
      setFloorPlans((prev) =>
        prev.map((fp) => (fp.id === activePlan.id ? updated : fp))
      );

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/floor-plans/${activePlan.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-organization-id": orgId,
            },
            body: JSON.stringify({ items: markers }),
          });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [activePlan, orgId]
  );

  const handleDelete = async (id: string) => {
    if (!orgId) return;
    setDeletingId(id);
    try {
      await fetch(`/api/floor-plans/${id}`, {
        method: "DELETE",
        headers: { "x-organization-id": orgId },
      });
      setFloorPlans((prev) => prev.filter((fp) => fp.id !== id));
      if (activePlan?.id === id) setActivePlan(null);
    } catch {
      await loadData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (fp: FloorPlan) => {
    setFloorPlans((prev) => [...prev, fp]);
    setActivePlan(fp);
  };

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Lagerorte
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {t("pageDesc")}
          </p>
        </div>
        {orgId && (
          <CreateFloorPlanDialog
            orgId={orgId}
            locations={locations}
            onCreated={handleCreated}
          />
        )}
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground font-mono animate-pulse">
          Lade Grundrisse...
        </div>
      )}

      {pageError && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">
          {pageError}
        </div>
      )}

      {!loading && floorPlans.length === 0 && !pageError && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium mb-1">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            {t("emptyDesc")}
          </p>
          {orgId && (
            <CreateFloorPlanDialog
              orgId={orgId}
              locations={locations}
              onCreated={handleCreated}
            />
          )}
        </div>
      )}

      {floorPlans.length > 0 && (
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar: plan list */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-1 mb-3">
              {t("floorPlans")} ({floorPlans.length})
            </p>
            {floorPlans.map((fp) => (
              <button
                key={fp.id}
                type="button"
                onClick={() => setActivePlan(fp)}
                className={[
                  "w-full text-left rounded-xl border p-3 transition-all duration-150",
                  activePlan?.id === fp.id
                    ? "border-foreground/30 bg-muted"
                    : "border-border hover:border-foreground/20 hover:bg-muted/40",
                ].join(" ")}
              >
                <p className="text-sm font-medium truncate">{fp.name}</p>
                {fp.locationName && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {fp.locationName}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  {fp.items?.length ?? 0} {t("markers")} · {formatDate(fp.updatedAt)}
                </p>
              </button>
            ))}
          </div>

          {/* Main editor area */}
          <div>
            {activePlan ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{activePlan.name}</CardTitle>
                      {activePlan.locationName && (
                        <CardDescription className="text-xs mt-0.5">
                          {activePlan.locationName}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {saving && (
                        <span className="text-xs text-muted-foreground font-mono animate-pulse">
                          Speichert...
                        </span>
                      )}
                      <DeleteConfirmDialog
                        fpName={activePlan.name}
                        loading={deletingId === activePlan.id}
                        onConfirm={() => handleDelete(activePlan.id)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FloorPlanEditor
                    imageUrl={activePlan.imageUrl}
                    markers={activePlan.items ?? []}
                    onMarkersChange={handleMarkersChange}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {t("selectPlan")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
