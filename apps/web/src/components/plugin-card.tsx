"use client";

import {
  IconFileImport,
  IconFileExport,
  IconPlug,
  IconTool,
  IconBarcode,
  IconBrandSlack,
  IconDownload,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Icon mapping ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconFileImport,
  IconFileExport,
  IconPlug,
  IconTool,
  IconBarcode,
  IconBrandSlack,
};

const CATEGORY_LABELS: Record<string, string> = {
  import: "Import",
  export: "Export",
  integration: "Integration",
  utility: "Werkzeug",
};

const CATEGORY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  import: "default",
  export: "secondary",
  integration: "outline",
  utility: "secondary",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface PluginCardProps {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  author: string | null;
  version: string | null;
  installed: boolean;
  enabled?: boolean | null;
  isBuiltin?: boolean | null;
  loading?: boolean;
  onInstall?: (id: string) => void;
  onUninstall?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function PluginCard(props: PluginCardProps) {
  const {
    id,
    name,
    description,
    icon,
    category,
    author,
    version,
    installed,
    enabled,
    isBuiltin,
    loading,
    onInstall,
    onUninstall,
    onClick,
  } = props;
  const IconComponent = icon ? ICON_MAP[icon] ?? IconPlug : IconPlug;
  const categoryLabel = category ? CATEGORY_LABELS[category] ?? category : null;
  const categoryVariant = category
    ? CATEGORY_VARIANTS[category] ?? "outline"
    : "outline";

  return (
    <Card
      className="group relative flex flex-col transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => onClick?.(id)}
    >
      <CardHeader className="flex-row items-start gap-3 space-y-0 pb-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <IconComponent className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm leading-tight">{name}</CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {categoryLabel && (
              <Badge variant={categoryVariant} className="text-[10px] px-1.5 py-0">
                {categoryLabel}
              </Badge>
            )}
            {isBuiltin && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Built-in
              </Badge>
            )}
            {version && (
              <span className="text-[10px] text-muted-foreground">
                v{version}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <CardDescription className="line-clamp-2 text-xs">
          {description}
        </CardDescription>

        {author && (
          <p className="text-[11px] text-muted-foreground">von {author}</p>
        )}

        <div className="mt-auto pt-2">
          {installed ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  onUninstall?.(id);
                }}
              >
                {loading ? (
                  <IconLoader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Deinstallieren
              </Button>
              <Badge
                variant={enabled ? "default" : "secondary"}
                className="text-[10px]"
              >
                {enabled ? (
                  <>
                    <IconCheck className="mr-0.5 size-3" />
                    Aktiv
                  </>
                ) : (
                  "Inaktiv"
                )}
              </Badge>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                onInstall?.(id);
              }}
            >
              {loading ? (
                <IconLoader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <IconDownload className="mr-1.5 size-3.5" />
              )}
              Installieren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
