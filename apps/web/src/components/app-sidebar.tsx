"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { LogoMark } from "@/components/logo"
import { useBrand } from "@/components/brand-provider"
import {
  IconCalendar,
  IconChecklist,
  IconChevronRight,
  IconClipboardCheck,
  IconClipboardList,
  IconDashboard,
  IconDatabase,
  IconFileInvoice,
  IconHelp,
  IconHistory,
  IconKey,
  IconMapPin,
  IconMap,
  IconPackage,
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
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
// Main Sidebar
// ---------------------------------------------------------------------------
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("nav")
  const { logo, orgName } = useBrand()

  const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: t("overview"),
        url: "/dashboard",
        icon: IconDashboard,
      },
      {
        title: t("materials"),
        url: "/dashboard/materials",
        icon: IconPackage,
      },
      {
        title: t("tools"),
        url: "/dashboard/tools",
        icon: IconTool,
      },
      {
        title: t("keys"),
        url: "/dashboard/keys",
        icon: IconKey,
      },
      {
        title: t("tasks"),
        url: "/dashboard/tasks",
        icon: IconChecklist,
      },
      {
        title: "Inventur",
        url: "/dashboard/inventory",
        icon: IconClipboardCheck,
      },
      {
        title: t("calendar"),
        url: "/dashboard/calendar",
        icon: IconCalendar,
      },
      {
        title: t("reports"),
        url: "/dashboard/reports",
        icon: IconReportAnalytics,
      },
    ],
    documents: [
      {
        name: t("locations"),
        url: "/dashboard/locations",
        icon: IconMapPin,
      },
      {
        name: "Karte",
        url: "/dashboard/map",
        icon: IconMap,
      },
      {
        name: t("suppliers"),
        url: "/dashboard/suppliers",
        icon: IconTruck,
      },
      {
        name: t("commissions"),
        url: "/dashboard/commissions",
        icon: IconClipboardList,
      },
      {
        name: t("cart"),
        url: "/dashboard/cart",
        icon: IconShoppingCart,
      },
      {
        name: t("openOrders"),
        url: "/dashboard/orders",
        icon: IconFileInvoice,
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
        ],
      },
    ],
    navSecondary: [
      {
        title: t("settings"),
        url: "/dashboard/settings",
        icon: IconSettings,
      },
      {
        title: t("customFields"),
        url: "/dashboard/settings/custom-fields",
        icon: IconListDetails,
      },
      {
        title: t("alerts"),
        url: "/dashboard/settings/alerts",
        icon: IconBell,
      },
      {
        title: "Automatisierungen",
        url: "/dashboard/settings/automations",
        icon: IconBolt,
      },
      {
        title: "Branding",
        url: "/dashboard/settings/branding",
        icon: IconSettings,
      },
      {
        title: t("team"),
        url: "/dashboard/settings/team",
        icon: IconUsers,
      },
      {
        title: "Rollen",
        url: "/dashboard/settings/roles",
        icon: IconShield,
      },
      {
        title: t("integrations"),
        url: "/dashboard/settings/integrations",
        icon: IconPlugConnected,
      },
      {
        title: t("help"),
        url: "/dashboard/help",
        icon: IconHelp,
      },
    ],
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <OrgSwitcher orgName={orgName} logo={logo} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
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
