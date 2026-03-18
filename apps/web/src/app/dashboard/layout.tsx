"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { DemoBanner } from "@/components/demo-banner"
import { SiteHeader } from "@/components/site-header"
import { BrandProvider } from "@/components/brand-provider"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()

  // Track whether we have already checked org membership to avoid repeated fetches
  const orgCheckDone = useRef(false)

  const devBypass = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEMO_MODE === "true"

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!devBypass && !isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router, devBypass])

  // ── Onboarding guard ────────────────────────────────────────────────────
  // Skip when: already on onboarding, in dev/demo bypass mode, or session is loading
  useEffect(() => {
    const isOnboarding = pathname === "/dashboard/onboarding"
    if (isOnboarding || isPending || orgCheckDone.current) return
    if (!devBypass && !session) return

    orgCheckDone.current = true

    const checkOrgs = async () => {
      try {
        const res = await fetch("/api/organizations")
        if (!res.ok) return
        const orgs: unknown[] = await res.json()
        if (Array.isArray(orgs) && orgs.length === 0) {
          router.push("/dashboard/onboarding")
        }
      } catch {
        // Network error — fail open, don't block the user
      }
    }

    void checkOrgs()
  }, [session, isPending, pathname, router, devBypass])

  if (!devBypass && isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    )
  }

  if (!devBypass && !session) {
    return null
  }

  return (
    <BrandProvider>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <DemoBanner />
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    </BrandProvider>
  )
}
