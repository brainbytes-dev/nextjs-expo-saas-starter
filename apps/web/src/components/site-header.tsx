"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/theme/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { IconSearch } from "@tabler/icons-react"

export function SiteHeader() {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Dashboard</h1>
        {/* Search trigger — opens Cmd+K palette */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="ml-4 flex flex-1 max-w-sm items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <IconSearch className="size-4" />
          <span className="hidden sm:inline">Suchen...</span>
          <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <ModeToggle />
          <Button variant="default" size="sm" onClick={handleUpgrade}>
            Upgrade
          </Button>
        </div>
      </div>
    </header>
  )
}
