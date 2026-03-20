"use client"

import { usePresence } from "@/hooks/use-presence"
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

/** Human-friendly page label from pathname */
function pageLabel(page: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Übersicht",
    "/dashboard/materials": "Materialien",
    "/dashboard/tools": "Werkzeuge",
    "/dashboard/keys": "Schlüssel",
    "/dashboard/tasks": "Aufgaben",
    "/dashboard/calendar": "Kalender",
    "/dashboard/reports": "Berichte",
    "/dashboard/settings": "Einstellungen",
    "/dashboard/locations": "Standorte",
    "/dashboard/suppliers": "Lieferanten",
    "/dashboard/orders": "Bestellungen",
    "/dashboard/commissions": "Aufträge",
    "/dashboard/inventory": "Inventur",
    "/dashboard/kanban": "Kanban",
    "/dashboard/time-tracking": "Zeiterfassung",
    "/dashboard/transfers": "Umbuchungen",
    "/dashboard/requests": "Anfragen",
  }
  return map[page] ?? page.replace("/dashboard/", "").replace(/-/g, " ")
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
              {count} {count === 1 ? "Benutzer" : "Benutzer"} online
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
          Online-Benutzer
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
                  {pageLabel(user.page)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
