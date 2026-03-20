"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { LogoMark } from "@/components/logo"
import { useBrand } from "@/components/brand-provider"
import {
  IconCalendar,
  IconCalendarEvent,
  IconInbox,
  IconChecklist,
  IconChevronRight,
  IconClipboardCheck,
  IconClipboardList,
  IconDashboard,
  IconDatabase,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFileInvoice,
  IconHelp,
  IconHistory,
  IconKey,
  IconMapPin,
  IconMap,
  IconPackage,
  IconPencil,
  IconPlugConnected,
  IconReportAnalytics,
  IconUsers,
  IconSettings,
  IconBell,
  IconListDetails,
  IconShoppingCart,
  IconTool,
  IconTruck,
  IconShield,
  IconBolt,
  IconBuilding,
  IconChevronDown,
  IconChartBar,
  IconCheck,
  IconKeyboard,
  IconBrain,
  IconDeviceTv,
  IconBarcode,
  IconLayoutKanban,
  IconArrowsTransferDown,
  IconWallet,
  IconClockHour5,
  IconShieldCheck,
  IconAdjustments,
  IconLink,
  IconAntenna,
  IconPrinter,
  IconPuzzle,
  IconGitBranch,
  IconDevices,
  IconShieldLock,
  IconClock,
  IconMail,
  IconRuler,
  IconUpload,
  IconTransfer,
  IconClipboardText,
  IconRepeat,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useShortcutsDialog } from "@/components/shortcuts-dialog"

import { NavDocuments } from "@/components/nav-documents"
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
                    {orgName || (
                      <>
                        Logistik<span className="text-primary">App</span>
                      </>
                    )}
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
                  <span>Konsolidierter Bericht</span>
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
                {orgName || (
                  <>
                    Logistik<span className="text-primary">App</span>
                  </>
                )}
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
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hidden: boolean
  onToggle: () => void
}) {
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
          aria-label={hidden ? `${title} einblenden` : `${title} ausblenden`}
          title={hidden ? `${title} einblenden` : `${title} ausblenden`}
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
    // Items that can be hidden. Key matches what is stored in localStorage.
    navMain: [
      {
        title: t("overview"),
        url: "/dashboard",
        icon: IconDashboard,
        hideable: false, // always visible
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
        title: "Zeiterfassung",
        url: "/dashboard/time-tracking",
        icon: IconClockHour5,
        hideable: true,
      },
      {
        title: "Kanban",
        url: "/dashboard/kanban",
        icon: IconLayoutKanban,
        hideable: true,
      },
      {
        title: "Inventur",
        url: "/dashboard/inventory",
        icon: IconClipboardCheck,
        hideable: true,
      },
      {
        title: t("calendar"),
        url: "/dashboard/calendar",
        icon: IconCalendar,
        hideable: true,
      },
      {
        title: "Reservierungen",
        url: "/dashboard/reservations",
        icon: IconCalendarEvent,
        hideable: true,
      },
      {
        title: "Anfragen",
        url: "/dashboard/requests",
        icon: IconInbox,
        hideable: true,
        badge: pendingRequestCount,
      },
      {
        title: t("reports"),
        url: "/dashboard/reports",
        icon: IconReportAnalytics,
        hideable: true,
      },
      {
        title: "Schichtübergabe",
        url: "/dashboard/shift-handover",
        icon: IconClipboardText,
        hideable: true,
      },
      {
        title: "Geräte-Auslastung",
        url: "/dashboard/utilization",
        icon: IconChartBar,
        hideable: true,
      },
      {
        title: "KI-Wartungsprognose",
        url: "/dashboard/maintenance-ai",
        icon: IconBrain,
        hideable: true,
      },
      {
        title: "Lieferkette",
        url: "/dashboard/supply-chain",
        icon: IconGitBranch,
        hideable: true,
      },
      {
        title: "TV-Modus",
        url: "/tv",
        icon: IconDeviceTv,
        hideable: true,
        newTab: true,
      },
    ],
    documents: [
      {
        name: t("locations"),
        url: "/dashboard/locations",
        icon: IconMapPin,
        hideable: true,
      },
      {
        name: "Karte",
        url: "/dashboard/map",
        icon: IconMap,
        hideable: true,
      },
      {
        name: t("suppliers"),
        url: "/dashboard/suppliers",
        icon: IconTruck,
        hideable: true,
      },
      {
        name: t("commissions"),
        url: "/dashboard/commissions",
        icon: IconClipboardList,
        hideable: true,
      },
      {
        name: "Kommissionen Kanban",
        url: "/dashboard/commissions/kanban",
        icon: IconLayoutKanban,
        hideable: true,
      },
      {
        name: "Umbuchungen",
        url: "/dashboard/transfers",
        icon: IconArrowsTransferDown,
        hideable: true,
      },
      {
        name: t("cart"),
        url: "/dashboard/cart",
        icon: IconShoppingCart,
        hideable: true,
      },
      {
        name: "Barcode-Generator",
        url: "/dashboard/barcode-generator",
        icon: IconBarcode,
        hideable: true,
      },
      {
        name: "Etiketten-Designer",
        url: "/dashboard/label-designer",
        icon: IconRuler,
        hideable: true,
      },
      {
        name: "Massendruck",
        url: "/dashboard/batch-print",
        icon: IconPrinter,
        hideable: true,
      },
      {
        name: t("openOrders"),
        url: "/dashboard/orders",
        icon: IconFileInvoice,
        hideable: true,
      },
      {
        name: "Wiederkehrende Bestellungen",
        url: "/dashboard/recurring-orders",
        icon: IconRepeat,
        hideable: true,
      },
      {
        name: "Lieferverfolgung",
        url: "/dashboard/deliveries",
        icon: IconTruck,
        hideable: true,
      },
      {
        name: "Garantieansprüche",
        url: "/dashboard/warranty-claims",
        icon: IconShieldCheck,
        hideable: true,
      },
      {
        name: "Bestandsoptimierung",
        url: "/dashboard/stock-adjust",
        icon: IconAdjustments,
        hideable: true,
      },
      {
        name: "Budgets",
        url: "/dashboard/budgets",
        icon: IconWallet,
        hideable: true,
      },
      {
        name: "Datenimport",
        url: "/dashboard/import",
        icon: IconUpload,
        hideable: true,
      },
      {
        name: "Migration",
        url: "/dashboard/migration",
        icon: IconTransfer,
        hideable: true,
      },
    ],
    navClouds: [
      {
        title: t("masterData"),
        icon: IconDatabase,
        items: [
          { title: t("masterLocations"), url: "/dashboard/master/locations" },
          { title: t("masterSuppliers"), url: "/dashboard/master/suppliers" },
          { title: t("masterProjects"), url: "/dashboard/master/projects" },
          { title: t("masterCustomers"), url: "/dashboard/master/customers" },
          {
            title: t("masterMaterialGroups"),
            url: "/dashboard/master/material-groups",
          },
          {
            title: t("masterToolGroups"),
            url: "/dashboard/master/tool-groups",
          },
        ],
      },
      {
        title: t("history"),
        icon: IconHistory,
        items: [
          { title: t("historyOrders"), url: "/dashboard/history/orders" },
          {
            title: t("historyOrderItems"),
            url: "/dashboard/history/order-items",
          },
          {
            title: t("historyStockChanges"),
            url: "/dashboard/history/stock-changes",
          },
          {
            title: t("historyToolBookings"),
            url: "/dashboard/history/tool-bookings",
          },
          {
            title: t("historyCommissions"),
            url: "/dashboard/history/commissions",
          },
          {
            title: t("historyChangelog"),
            url: "/dashboard/history/changelog",
          },
          {
            title: "Aktivitätsprotokoll",
            url: "/dashboard/history/activity",
          },
        ],
      },
    ],
    navSecondary: [
      {
        title: t("settings"),
        url: "/dashboard/settings",
        icon: IconSettings,
        hideable: false, // always visible
      },
      {
        title: "Wartungs-Checklisten",
        url: "/dashboard/settings/checklists",
        icon: IconChecklist,
        hideable: true,
      },
      {
        title: t("customFields"),
        url: "/dashboard/settings/custom-fields",
        icon: IconListDetails,
        hideable: true,
      },
      {
        title: t("alerts"),
        url: "/dashboard/settings/alerts",
        icon: IconBell,
        hideable: true,
      },
      {
        title: "Automatisierungen",
        url: "/dashboard/settings/automations",
        icon: IconBolt,
        hideable: true,
      },
      {
        title: "Branding",
        url: "/dashboard/settings/branding",
        icon: IconSettings,
        hideable: true,
      },
      {
        title: t("team"),
        url: "/dashboard/settings/team",
        icon: IconUsers,
        hideable: true,
      },
      {
        title: "Rollen",
        url: "/dashboard/settings/roles",
        icon: IconShield,
        hideable: true,
      },
      {
        title: "KI-Funktionen",
        url: "/dashboard/settings/ai",
        icon: IconBrain,
        hideable: true,
      },
      {
        title: "Handscanner",
        url: "/dashboard/settings/scanner",
        icon: IconBarcode,
        hideable: true,
      },
      {
        title: "Etikettendrucker",
        url: "/dashboard/settings/printer",
        icon: IconPrinter,
        hideable: true,
      },
      {
        title: "RFID Reader",
        url: "/dashboard/settings/rfid",
        icon: IconAntenna,
        hideable: true,
      },
      {
        title: "Schnelltasten",
        url: "/dashboard/settings/keypad",
        icon: IconKeyboard,
        hideable: true,
      },
      {
        title: t("integrations"),
        url: "/dashboard/settings/integrations",
        icon: IconPlugConnected,
        hideable: true,
      },
      {
        title: "Externe Portale",
        url: "/dashboard/portals",
        icon: IconLink,
        hideable: true,
      },
      {
        title: "Plugins",
        url: "/dashboard/settings/plugins",
        icon: IconPuzzle,
        hideable: true,
      },
      {
        title: "Sitzungen",
        url: "/dashboard/settings/sessions",
        icon: IconDevices,
        hideable: true,
      },
      {
        title: "IP-Zugriff",
        url: "/dashboard/settings/ip-allowlist",
        icon: IconShieldLock,
        hideable: true,
      },
      {
        title: "Datenhaltung",
        url: "/dashboard/settings/data-retention",
        icon: IconClock,
        hideable: true,
      },
      {
        title: "E-Mail Posteingang",
        url: "/dashboard/settings/email-inbox",
        icon: IconMail,
        hideable: true,
      },
    ],
  }

  // ── Filtered lists for normal (non-edit) mode ────────────────────────────
  const visibleNavMain = editMode
    ? data.navMain
    : data.navMain.filter((item) => !item.hideable || !hiddenItems.has(item.url))

  const visibleDocuments = editMode
    ? data.documents
    : data.documents.filter((item) => !item.hideable || !hiddenItems.has(item.url))

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
                    />
                  ) : (
                    // Non-hideable items show as locked/static
                    <SidebarMenuItem key={item.url}>
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm opacity-60 cursor-default select-none">
                        <item.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{item.title}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          Immer
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

        {/* ── Documents / Betrieb ───────────────────────────────── */}
        {editMode ? (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Betrieb</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.documents.map((item) => (
                  <EditModeRow
                    key={item.url}
                    icon={item.icon}
                    title={item.name}
                    hidden={hiddenItems.has(item.url)}
                    onToggle={() => toggleHidden(item.url)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <NavDocuments items={visibleDocuments} />
        )}

        {/* ── Collapsible sections (Stammdaten / Verlauf) ──────── */}
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
                    />
                  ) : (
                    <SidebarMenuItem key={item.url}>
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm opacity-60 cursor-default select-none">
                        <item.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{item.title}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          Immer
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
            {/* Hilfe — external link, always shown */}
            <SidebarGroup className="pb-2">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href="https://docs.logistikapp.ch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <IconHelp className="size-4 shrink-0" />
                        <span>{t("help")}</span>
                        <IconExternalLink className="ml-auto size-3.5 text-muted-foreground/70" aria-hidden />
                      </a>
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
                    <span>Fertig</span>
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
              title="Sidebar anpassen"
              aria-label="Sidebar anpassen"
              className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <IconPencil className="size-3.5 shrink-0" aria-hidden />
              <span>Bearbeiten</span>
            </button>

            {/* ⌘K hint + Shortcuts dialog trigger */}
            <button
              type="button"
              onClick={() => openShortcuts(true)}
              title="Tastaturkürzel anzeigen (?)"
              aria-label="Tastaturkürzel anzeigen"
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
  items: { title: string; url: string }[]
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
                        <a href={item.url}>
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
