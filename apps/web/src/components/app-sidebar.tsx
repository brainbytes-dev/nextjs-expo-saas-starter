"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { LogoMark, Wordmark } from "@/components/logo"
import { useBrand } from "@/components/brand-provider"
import {
  IconBook,
  IconBuilding,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
  IconClipboardList,
  IconDashboard,
  IconDatabase,
  IconEye,
  IconEyeOff,
  IconHistory,
  IconInbox,
  IconKey,
  IconKeyboard,
  IconLifebuoy,
  IconLink,
  IconMapPin,
  IconPackage,
  IconPencil,
  IconPrinter,
  IconReportAnalytics,
  IconSettings,
  IconTool,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useShortcutsDialog } from "@/components/shortcuts-dialog"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { OnlineUsers } from "@/components/online-users"
import { SidebarFavorites } from "@/components/sidebar-favorites"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ---------------------------------------------------------------------------
// localStorage key
// ---------------------------------------------------------------------------
const STORAGE_KEY = "sidebar_hidden_items"

function loadHiddenItems(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set<string>(parsed)
  } catch {
    // malformed — ignore
  }
  return new Set()
}

function saveHiddenItems(hidden: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]))
  } catch {
    // storage full or SSR — ignore
  }
}

// ---------------------------------------------------------------------------
// Org Switcher
// ---------------------------------------------------------------------------
interface OrgEntry {
  id: string
  name: string
  slug: string
  logo: string | null
}

function OrgSwitcher({
  orgName,
  logo,
}: {
  orgName: string | null
  logo: string | null
}) {
  const t = useTranslations("nav")
  const [orgs, setOrgs] = React.useState<OrgEntry[]>([])
  const [loaded, setLoaded] = React.useState(false)

  // Lazy-load org list on first open attempt
  const loadOrgs = React.useCallback(async () => {
    if (loaded) return
    try {
      const res = await fetch("/api/consolidated/stats")
      if (res.ok) {
        const data = await res.json()
        setOrgs(data.orgs ?? [])
      }
    } catch {
      // silent — switcher just won't show extra options
    } finally {
      setLoaded(true)
    }
  }, [loaded])

  const hasMultiple = orgs.length > 1

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {hasMultiple ? (
          <DropdownMenu onOpenChange={(open) => { if (open) loadOrgs() }}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                asChild={false}
                className="data-[slot=sidebar-menu-button]:p-1.5!"
                onMouseEnter={loadOrgs}
              >
                <div className="flex w-full items-center gap-2">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt={orgName || "Logo"}
                      className="h-5 w-5 rounded-sm object-contain"
                    />
                  ) : (
                    <LogoMark size={20} />
                  )}
                  <span className="flex-1 truncate text-base font-semibold">
                    {orgName || <Wordmark className="inline" />}
                  </span>
                  <IconChevronDown className="ml-auto size-3.5 text-muted-foreground" />
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="min-w-52">
              {orgs.map((org) => (
                <DropdownMenuItem key={org.id} asChild>
                  <a href={`/dashboard?org=${org.slug}`} className="flex items-center gap-2">
                    {org.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo} alt={org.name} className="size-5 rounded-sm object-contain" />
                    ) : (
                      <IconBuilding className="size-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{org.name}</span>
                  </a>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/dashboard/consolidated" className="flex items-center gap-2">
                  <IconChartBar className="size-4 text-muted-foreground" />
                  <span>{t("consolidatedReport")}</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton
            asChild
            className="data-[slot=sidebar-menu-button]:p-1.5!"
            onMouseEnter={loadOrgs}
          >
            <a href="/dashboard">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={orgName || "Logo"}
                  className="h-5 w-5 rounded-sm object-contain"
                />
              ) : (
                <LogoMark size={20} />
              )}
              <span className="text-base font-semibold">
                {orgName || <Wordmark className="inline" />}
              </span>
            </a>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ---------------------------------------------------------------------------
// EditModeToggleRow — shown for each hideable nav item in edit mode
// ---------------------------------------------------------------------------
function EditModeRow({
  icon: Icon,
  title,
  hidden,
  onToggle,
  showLabel,
  hideLabel,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hidden: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
}) {
  const ariaLabel = hidden ? showLabel : hideLabel
  return (
    <SidebarMenuItem>
      <div
        className={
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-opacity " +
          (hidden ? "opacity-50" : "opacity-100")
        }
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className={hidden ? "line-through text-muted-foreground" : "flex-1"}>
          {title}
        </span>
        <button
          type="button"
          aria-label={ariaLabel}
          title={ariaLabel}
          onClick={onToggle}
          className="ml-auto rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          {hidden ? (
            <IconEyeOff className="size-4" aria-hidden />
          ) : (
            <IconEye className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </SidebarMenuItem>
  )
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("nav")
  const { logo, orgName } = useBrand()
  const { setOpen: openShortcuts } = useShortcutsDialog()

  // ── Sidebar customisation state ─────────────────────────────────────────
  const [editMode, setEditMode] = React.useState(false)
  const [hiddenItems, setHiddenItems] = React.useState<Set<string>>(new Set())

  // Load persisted hidden items once on mount (client-only)
  React.useEffect(() => {
    setHiddenItems(loadHiddenItems())
  }, [])

  const toggleHidden = React.useCallback((key: string) => {
    setHiddenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      saveHiddenItems(next)
      return next
    })
  }, [])

  const exitEditMode = () => setEditMode(false)

  // ── Pending requests badge ───────────────────────────────────────────────
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0)
  React.useEffect(() => {
    fetch("/api/material-requests?status=pending")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setPendingRequestCount(data.length)
      })
      .catch(() => {})
  }, [])

  // ── Nav item definitions ─────────────────────────────────────────────────
  const data = {
    navMain: [
      {
        title: t("overview"),
        url: "/dashboard",
        icon: IconDashboard,
        hideable: false,
      },
      {
        title: t("materials"),
        url: "/dashboard/materials",
        icon: IconPackage,
        hideable: true,
      },
      {
        title: t("tools"),
        url: "/dashboard/tools",
        icon: IconTool,
        hideable: true,
      },
      {
        title: t("keys"),
        url: "/dashboard/keys",
        icon: IconKey,
        hideable: true,
      },
      {
        title: t("tasks"),
        url: "/dashboard/tasks",
        icon: IconChecklist,
        hideable: true,
      },
      {
        title: t("requests"),
        url: "/dashboard/requests",
        icon: IconInbox,
        hideable: true,
        badge: pendingRequestCount,
      },
      {
        title: t("calendar"),
        url: "/dashboard/calendar",
        icon: IconCalendar,
        hideable: true,
      },
      {
        title: t("reports"),
        url: "/dashboard/reports",
        icon: IconReportAnalytics,
        hideable: true,
      },
    ],
    navClouds: [
      {
        title: t("operations"),
        icon: IconClipboardList,
        items: [
          { title: t("commissions"), url: "/dashboard/commissions" },
          { title: t("commissionsKanban"), url: "/dashboard/commissions/kanban" },
          { title: t("transfers"), url: "/dashboard/transfers" },
          { title: t("openOrders"), url: "/dashboard/orders" },
          { title: t("recurringOrders"), url: "/dashboard/recurring-orders" },
          { title: t("deliveryTracking"), url: "/dashboard/deliveries" },
          { title: t("cart"), url: "/dashboard/cart" },
          { title: t("inventory"), url: "/dashboard/inventory" },
          { title: t("reservations"), url: "/dashboard/reservations" },
          { title: t("warrantyClaims"), url: "/dashboard/warranty-claims" },
          { title: t("suppliers"), url: "/dashboard/suppliers" },
        ],
      },
      {
        title: t("locationsGroup"),
        icon: IconMapPin,
        items: [
          { title: t("locations"), url: "/dashboard/locations" },
          { title: t("map"), url: "/dashboard/map" },
          { title: t("vehicles"), url: "/dashboard/vehicles" },
        ],
      },
      {
        title: t("planningAnalysis"),
        icon: IconChartBar,
        items: [
          { title: t("timeTracking"), url: "/dashboard/time-tracking" },
          { title: t("kanban"), url: "/dashboard/kanban" },
          { title: t("shiftHandover"), url: "/dashboard/shift-handover" },
          { title: t("utilization"), url: "/dashboard/utilization" },
          { title: t("maintenanceAi"), url: "/dashboard/maintenance-ai" },
          { title: t("supplyChain"), url: "/dashboard/supply-chain" },
          { title: t("stockOptimization"), url: "/dashboard/stock-adjust" },
          { title: t("budgets"), url: "/dashboard/budgets" },
        ],
      },
      {
        title: t("masterData"),
        icon: IconDatabase,
        items: [
          { title: t("masterLocations"), url: "/dashboard/master/locations" },
          { title: t("masterSuppliers"), url: "/dashboard/master/suppliers" },
          { title: t("masterProjects"), url: "/dashboard/master/projects" },
          { title: t("masterCustomers"), url: "/dashboard/master/customers" },
          { title: t("masterMaterialGroups"), url: "/dashboard/master/material-groups" },
          { title: t("masterToolGroups"), url: "/dashboard/master/tool-groups" },
        ],
      },
      {
        title: t("history"),
        icon: IconHistory,
        items: [
          { title: t("historyOrders"), url: "/dashboard/history/orders" },
          { title: t("historyOrderItems"), url: "/dashboard/history/order-items" },
          { title: t("historyStockChanges"), url: "/dashboard/history/stock-changes" },
          { title: t("historyToolBookings"), url: "/dashboard/history/tool-bookings" },
          { title: t("historyCommissions"), url: "/dashboard/history/commissions" },
          { title: t("historyChangelog"), url: "/dashboard/history/changelog" },
          { title: t("activityLog"), url: "/dashboard/history/activity" },
        ],
      },
      {
        title: t("toolsPrint"),
        icon: IconPrinter,
        items: [
          { title: t("barcodeGenerator"), url: "/dashboard/barcode-generator" },
          { title: t("labelDesigner"), url: "/dashboard/label-designer" },
          { title: t("batchPrint"), url: "/dashboard/batch-print" },
          { title: t("dataImport"), url: "/dashboard/import" },
          { title: t("migration"), url: "/dashboard/migration" },
          { title: t("tvMode"), url: "/tv", newTab: true },
        ],
      },
    ],
    navSecondary: [
      {
        title: t("settings"),
        url: "/dashboard/settings",
        icon: IconSettings,
        hideable: false,
      },
      {
        title: t("externalPortals"),
        url: "/dashboard/portals",
        icon: IconLink,
        hideable: false,
      },
    ],
  }

  // ── Filtered lists for normal (non-edit) mode ────────────────────────────
  const visibleNavMain = editMode
    ? data.navMain
    : data.navMain.filter((item) => !item.hideable || !hiddenItems.has(item.url))

  const visibleNavSecondary = editMode
    ? data.navSecondary
    : data.navSecondary.filter((item) => !item.hideable || !hiddenItems.has(item.url))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <OrgSwitcher orgName={orgName} logo={logo} />
      </SidebarHeader>

      <SidebarContent>
        {/* ── Favorites & Recent ──────────────────────────────── */}
        {!editMode && <SidebarFavorites />}

        {/* ── Main nav ──────────────────────────────────────────── */}
        {editMode ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.navMain.map((item) =>
                  item.hideable ? (
                    <EditModeRow
                      key={item.url}
                      icon={item.icon}
                      title={item.title}
                      hidden={hiddenItems.has(item.url)}
                      onToggle={() => toggleHidden(item.url)}
                      showLabel={t("showItem", { title: item.title })}
                      hideLabel={t("hideItem", { title: item.title })}
                    />
                  ) : (
                    // Non-hideable items show as locked/static
                    <SidebarMenuItem key={item.url}>
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm opacity-60 cursor-default select-none">
                        <item.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{item.title}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          {t("always")}
                        </span>
                      </div>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <NavMain items={visibleNavMain} />
        )}

        {/* ── Collapsible sections ──────────────────────────────── */}
        {!editMode && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            {data.navClouds.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                icon={section.icon}
                items={section.items}
              />
            ))}
          </SidebarGroup>
        )}

        {/* ── Secondary nav ─────────────────────────────────────── */}
        {editMode ? (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {data.navSecondary.map((item) =>
                  item.hideable ? (
                    <EditModeRow
                      key={item.url}
                      icon={item.icon}
                      title={item.title}
                      hidden={hiddenItems.has(item.url)}
                      onToggle={() => toggleHidden(item.url)}
                      showLabel={t("showItem", { title: item.title })}
                      hideLabel={t("hideItem", { title: item.title })}
                    />
                  ) : (
                    <SidebarMenuItem key={item.url}>
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm opacity-60 cursor-default select-none">
                        <item.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{item.title}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          {t("always")}
                        </span>
                      </div>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <NavSecondary
              items={visibleNavSecondary}
              className="mt-auto"
            />
            {/* Hilfe — docs + support */}
            <SidebarGroup className="pb-2">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="flex items-center gap-2">
                      <a href="https://docs.zentory.ch" target="_blank" rel="noopener noreferrer">
                        <IconBook className="size-4 shrink-0" />
                        <span>{t("docs")}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="flex items-center gap-2">
                      <Link href="/dashboard/support">
                        <IconLifebuoy className="size-4 shrink-0" />
                        <span>{t("support")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* ── Edit mode: Fertig button ───────────────────────────── */}
        {editMode && (
          <SidebarGroup className="pb-2">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild={false}
                    onClick={exitEditMode}
                    className="w-full justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    <IconCheck className="size-4" />
                    <span>{t("done")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <OnlineUsers />
        <NavUser />

        {/* ── Footer utility row — only shown when NOT in edit mode ── */}
        {!editMode && (
          <div className="flex items-center gap-1 px-2 pb-1">
            {/* Bearbeiten */}
            <button
              type="button"
              onClick={() => setEditMode(true)}
              title={t("customizeSidebar")}
              aria-label={t("customizeSidebar")}
              className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <IconPencil className="size-3.5 shrink-0" aria-hidden />
              <span>{t("editSidebar")}</span>
            </button>

            {/* ⌘K hint + Shortcuts dialog trigger */}
            <button
              type="button"
              onClick={() => openShortcuts(true)}
              title={t("showShortcuts")}
              aria-label={t("showShortcuts")}
              className="flex items-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <IconKeyboard className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: { title: string; url: string; newTab?: boolean }[]
}) {
  const pathname = usePathname()
  const hasActive = items.some(
    (item) => pathname === item.url || pathname.startsWith(item.url)
  )
  const [open, setOpen] = React.useState(hasActive)

  return (
    <>
      <SidebarGroupLabel className="sr-only">{title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setOpen(!open)} isActive={hasActive && !open}>
              <Icon />
              <span>{title}</span>
              <IconChevronRight
                className={`ml-auto size-4 transition-transform ${open ? "rotate-90" : ""}`}
              />
            </SidebarMenuButton>
            {open && (
              <SidebarMenuSub>
                {items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url)
                  return (
                    <SidebarMenuSubItem key={item.url}>
                      <SidebarMenuSubButton asChild isActive={isActive}>
                        <a
                          href={item.url}
                          {...(item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </>
  )
}
