"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  IconStar,
  IconClock,
  IconChevronDown,
  IconPackage,
  IconTool,
  IconMapPin,
  IconClipboardList,
  IconFile,
} from "@tabler/icons-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  getFavorites,
  getRecentItems,
  type FavoriteItem,
  type RecentItem,
} from "@/lib/favorites"

// ── Entity type icons ─────────────────────────────────────────────────────────

function EntityIcon({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const base = cn("size-3.5 shrink-0", className)
  switch (type) {
    case "material":
      return <IconPackage className={base} />
    case "tool":
      return <IconTool className={base} />
    case "location":
      return <IconMapPin className={base} />
    case "commission":
      return <IconClipboardList className={base} />
    case "page":
      return <IconFile className={base} />
    default:
      return <IconStar className={base} />
  }
}

// ── Collapsible wrapper ───────────────────────────────────────────────────────

function CollapsibleGroup({
  label,
  icon: Icon,
  defaultOpen = true,
  children,
  empty,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  defaultOpen?: boolean
  children: React.ReactNode
  empty: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden py-0">
      <SidebarGroupLabel
        asChild
        className="cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <button
          type="button"
          className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          <IconChevronDown
            className={cn(
              "size-3 transition-transform",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>
      </SidebarGroupLabel>

      {open && (
        <SidebarGroupContent>
          <SidebarMenu>{children}</SidebarMenu>
          {React.Children.count(children) === 0 && empty}
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

// ── Favorites section ─────────────────────────────────────────────────────────

function FavoritesSection() {
  const pathname = usePathname()
  const [items, setItems] = React.useState<FavoriteItem[]>([])

  React.useEffect(() => {
    setItems(getFavorites())
  }, [])

  // Re-sync on storage events (cross-tab) and custom events (same-tab)
  React.useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "favorites") setItems(getFavorites())
    }
    const customHandler = () => setItems(getFavorites())
    window.addEventListener("storage", storageHandler)
    window.addEventListener("favorites-updated", customHandler)
    return () => {
      window.removeEventListener("storage", storageHandler)
      window.removeEventListener("favorites-updated", customHandler)
    }
  }, [])

  return (
    <CollapsibleGroup
      label="Favoriten"
      icon={IconStar}
      defaultOpen={true}
      empty={
        <p className="px-2 py-1.5 text-xs text-muted-foreground/50">
          Keine Favoriten
        </p>
      }
    >
      {items.map((item) => {
        const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild isActive={isActive} className="h-7 text-xs">
              <a href={item.url} className="flex items-center gap-2">
                <EntityIcon type={item.type} />
                <span className="truncate">{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </CollapsibleGroup>
  )
}

// ── Recent Items section ──────────────────────────────────────────────────────

function RecentItemsSection() {
  const pathname = usePathname()
  const [items, setItems] = React.useState<RecentItem[]>([])

  React.useEffect(() => {
    setItems(getRecentItems())
  }, [])

  React.useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "recentItems") setItems(getRecentItems())
    }
    const customHandler = () => setItems(getRecentItems())
    window.addEventListener("storage", storageHandler)
    window.addEventListener("favorites-updated", customHandler)
    return () => {
      window.removeEventListener("storage", storageHandler)
      window.removeEventListener("favorites-updated", customHandler)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <CollapsibleGroup
      label="Zuletzt besucht"
      icon={IconClock}
      defaultOpen={false}
      empty={null}
    >
      {items.map((item) => {
        const isActive = pathname === item.url
        return (
          <SidebarMenuItem key={`${item.id}-${item.visitedAt}`}>
            <SidebarMenuButton asChild isActive={isActive} className="h-7 text-xs">
              <a href={item.url} className="flex items-center gap-2">
                <EntityIcon type={item.type} className="text-muted-foreground/60" />
                <span className="truncate">{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </CollapsibleGroup>
  )
}

// ── Combined export ───────────────────────────────────────────────────────────

export function SidebarFavorites() {
  return <RecentItemsSection />
}
