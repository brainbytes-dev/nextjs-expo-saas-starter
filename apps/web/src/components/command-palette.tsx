"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  IconSearch, IconPackage, IconTool, IconMapPin,
  IconPlus, IconHistory, IconSettings, IconLayoutDashboard,
  IconChevronRight, IconClock, IconStar,
} from "@tabler/icons-react"
import { getRecentItems, getFavorites, type RecentItem, type FavoriteItem } from "@/lib/favorites"

// Static navigation items
const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",       href: "/dashboard",                       icon: IconLayoutDashboard, group: "Navigation" },
  { id: "materials",    label: "Materialien",      href: "/dashboard/materials",             icon: IconPackage,         group: "Navigation" },
  { id: "tools",        label: "Werkzeuge",         href: "/dashboard/tools",                 icon: IconTool,            group: "Navigation" },
  { id: "locations",    label: "Standorte",         href: "/dashboard/locations",             icon: IconMapPin,          group: "Navigation" },
  { id: "history",      label: "Verlauf",           href: "/dashboard/history/stock-changes", icon: IconHistory,         group: "Navigation" },
  { id: "settings",     label: "Einstellungen",     href: "/dashboard/settings",              icon: IconSettings,        group: "Navigation" },
  { id: "new-material", label: "Neues Material",    href: "/dashboard/materials/new",         icon: IconPlus,            group: "Aktionen" },
  { id: "new-tool",     label: "Neues Werkzeug",    href: "/dashboard/tools/new",             icon: IconPlus,            group: "Aktionen" },
  { id: "new-location", label: "Neuer Standort",    href: "/dashboard/locations/new",         icon: IconPlus,            group: "Aktionen" },
]

// Group order — static groups first, dynamic groups appended at runtime
const STATIC_GROUP_ORDER = ["Navigation", "Materialien", "Werkzeuge", "Standorte", "Aktionen"]
const DYNAMIC_GROUPS = ["Zuletzt besucht", "Favoriten"]

interface PaletteItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  group: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const router = useRouter()

  // Open on Cmd+K / Ctrl+K or custom event
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    const customHandler = () => setOpen(true)
    window.addEventListener("keydown", handler)
    window.addEventListener("open-command-palette", customHandler)
    return () => {
      window.removeEventListener("keydown", handler)
      window.removeEventListener("open-command-palette", customHandler)
    }
  }, [])

  // Load dynamic items from localStorage when opening
  useEffect(() => {
    async function loadDynamicItems() {
      setRecentItems(getRecentItems())
      setFavorites(getFavorites())
    }
    if (open) loadDynamicItems()
  }, [open])

  // Reset query when closing
  function handleOpenChange(val: boolean) {
    if (!val) {
      setQuery("")
      setSelectedIdx(0)
    }
    setOpen(val)
  }

  // Build full item list including dynamic groups
  const allItems: PaletteItem[] = [
    ...NAV_ITEMS,
    ...recentItems.map((r) => ({
      id: `recent-${r.id}`,
      label: r.name,
      href: r.url,
      icon: IconClock,
      group: "Zuletzt besucht",
    })),
    ...favorites.map((f) => ({
      id: `fav-${f.id}`,
      label: f.name,
      href: f.url,
      icon: IconStar,
      group: "Favoriten",
    })),
  ]

  // Filter items
  const filtered = query.trim() === ""
    ? allItems
    : allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.group.toLowerCase().includes(query.toLowerCase())
      )

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
      }
      if (e.key === "Enter") {
        e.preventDefault()
        const item = filtered[selectedIdx]
        if (item) {
          router.push(item.href)
          setOpen(false)
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, filtered, selectedIdx, router])

  // Reset selectedIdx on query change
  useEffect(() => {
    async function resetIdx() { setSelectedIdx(0) }
    resetIdx()
  }, [query])

  // Group items preserving order
  const groups = filtered.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const groupOrder = [...STATIC_GROUP_ORDER, ...DYNAMIC_GROUPS]
  const orderedGroups = groupOrder
    .filter(g => groups[g]?.length)
    .map(g => ({ name: g, items: groups[g]! }))

  // Also include any groups not in either order list
  Object.keys(groups).forEach(g => {
    if (!groupOrder.includes(g)) {
      orderedGroups.push({ name: g, items: groups[g]! })
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 max-w-[520px] overflow-hidden border-border/60 shadow-2xl"
        aria-label="Befehlspalette"
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 border-b border-border/60 bg-background">
          <IconSearch className="size-[15px] text-muted-foreground/70 shrink-0" strokeWidth={1.75} />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
            placeholder="Suchen oder navigieren…"
            className="flex-1 py-[14px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 font-mono tracking-tight"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-px text-[10px] font-mono text-muted-foreground/60 border border-border/60 rounded-sm px-1.5 leading-none shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-mono text-muted-foreground/50">
                Keine Ergebnisse für{" "}
                <span className="text-muted-foreground">&ldquo;{query}&rdquo;</span>
              </p>
            </div>
          ) : (
            <div className="py-1.5">
              {orderedGroups.map(({ name, items }) => {
                const groupOffset = filtered.indexOf(items[0]!)
                return (
                  <div key={name}>
                    {/* Group header */}
                    <div className="flex items-center gap-3 px-4 pt-3 pb-1">
                      <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/40 select-none">
                        {name}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>

                    {/* Group items */}
                    {items.map((item, localIdx) => {
                      const globalIdx = groupOffset + localIdx
                      const Icon = item.icon
                      const isSelected = globalIdx === selectedIdx

                      return (
                        <button
                          key={item.id}
                          className={[
                            "group w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-75 relative",
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground/80 hover:bg-accent/40 hover:text-foreground",
                          ].join(" ")}
                          onClick={() => {
                            router.push(item.href)
                            setOpen(false)
                          }}
                          onMouseEnter={() => setSelectedIdx(globalIdx)}
                        >
                          {/* Left accent bar on selected */}
                          {isSelected && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-foreground/60 rounded-full" />
                          )}

                          <Icon
                            className={[
                              "size-[15px] shrink-0 transition-colors",
                              isSelected ? "text-foreground/80" : "text-muted-foreground/50 group-hover:text-muted-foreground/80",
                            ].join(" ")}
                            strokeWidth={1.75}
                          />

                          <span className="flex-1 text-left font-mono text-[13px] tracking-tight">
                            {item.label}
                          </span>

                          <IconChevronRight
                            className={[
                              "size-3 shrink-0 transition-all duration-75",
                              isSelected
                                ? "text-foreground/50 translate-x-0 opacity-100"
                                : "text-muted-foreground/30 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60",
                            ].join(" ")}
                            strokeWidth={1.75}
                          />
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-muted/30 px-4 py-2 flex items-center gap-5">
          <FooterHint keys={["↑", "↓"]} label="navigieren" />
          <FooterHint keys={["↵"]} label="öffnen" />
          <FooterHint keys={["ESC"]} label="schliessen" />
          <div className="ml-auto flex items-center gap-1.5">
            <kbd className="inline-flex h-4 items-center gap-px text-[9px] font-mono text-muted-foreground/50 border border-border/50 rounded-sm px-1 leading-none">
              ⌘K
            </kbd>
            <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wide">toggle</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {keys.map(k => (
          <kbd
            key={k}
            className="inline-flex h-4 items-center justify-center min-w-[16px] px-1 text-[9px] font-mono text-muted-foreground/50 border border-border/50 rounded-sm leading-none"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wide">{label}</span>
    </span>
  )
}
