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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
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
          </SidebarMenuItem>
        </SidebarMenu>
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
