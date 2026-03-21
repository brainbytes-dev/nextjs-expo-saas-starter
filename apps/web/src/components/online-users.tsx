"use client"

import { usePresence } from "@/hooks/use-presence"
import { useTranslations } from "next-intl"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconUsers, IconCircleFilled } from "@tabler/icons-react"

const MAX_VISIBLE = 3

/** Map of pathname to translation key for page label */
const PAGE_KEY_MAP: Record<string, string> = {
  "/dashboard": "overview",
  "/dashboard/materials": "materials",
  "/dashboard/tools": "tools",
  "/dashboard/keys": "keys",
  "/dashboard/tasks": "tasks",
  "/dashboard/calendar": "calendar",
  "/dashboard/reports": "reports",
  "/dashboard/settings": "settings",
  "/dashboard/locations": "locations",
  "/dashboard/suppliers": "suppliers",
  "/dashboard/orders": "orders",
  "/dashboard/commissions": "commissions",
  "/dashboard/inventory": "inventory",
  "/dashboard/kanban": "kanban",
  "/dashboard/time-tracking": "timeTracking",
  "/dashboard/transfers": "transfers",
  "/dashboard/requests": "requests",
}

/** Get initials from a name */
function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function OnlineUsers() {
  const t = useTranslations("onlineUsers")
  const { onlineUsers, count } = usePresence()

  if (count === 0) return null

  const visible = onlineUsers.slice(0, MAX_VISIBLE)
  const overflow = count - MAX_VISIBLE

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <div className="flex items-center gap-1.5">
            <IconUsers className="size-3.5 shrink-0" />
            <span>
              {t("usersOnline", { count })}
            </span>
          </div>

          <div className="ml-auto flex items-center">
            <AvatarGroup>
              {visible.map((user) => (
                <Avatar key={user.id} size="sm" className="relative">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {overflow > 0 && (
                <AvatarGroupCount>
                  <span className="text-[10px]">+{overflow}</span>
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" align="start" className="w-64 p-2">
        <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
          {t("title")}
        </p>
        <ul className="space-y-1">
          {onlineUsers.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <div className="relative">
                <Avatar size="sm">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <IconCircleFilled className="absolute -right-0.5 -bottom-0.5 size-2.5 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground leading-tight">
                  {PAGE_KEY_MAP[user.page] ? t(`pages.${PAGE_KEY_MAP[user.page]}`) : user.page.replace("/dashboard/", "").replace(/-/g, " ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
