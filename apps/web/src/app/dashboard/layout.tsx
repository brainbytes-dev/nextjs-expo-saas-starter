"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { SiteHeader } from "@/components/site-header"
import { BrandProvider } from "@/components/brand-provider"
import { BarcodeScannerProvider } from "@/components/barcode-scanner-provider"
import { RealtimeProvider } from "@/providers/realtime-provider"
import { ShortcutsDialogProvider } from "@/components/shortcuts-dialog"
import { WelcomeTour } from "@/components/welcome-tour"
import { FeatureGateProvider } from "@/components/feature-gate-provider"
import { AiChatTrigger } from "@/components/ai-chat-trigger"
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

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  // ── Onboarding guard ────────────────────────────────────────────────────
  // Skip when: already on onboarding, or session is loading
  useEffect(() => {
    const isOnboarding = pathname === "/dashboard/onboarding"
    if (isOnboarding || isPending || orgCheckDone.current) return
    if (!session) return

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
  }, [session, isPending, pathname, router])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <FeatureGateProvider>
    <RealtimeProvider>
    <BrandProvider>
      <BarcodeScannerProvider>
      <ShortcutsDialogProvider>
        <SidebarProvider
          style={{
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties}
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                {children}
              </div>
            </div>
          </SidebarInset>
          <CommandPalette />
          <WelcomeTour />
          <AiChatTrigger />
        </SidebarProvider>
      </ShortcutsDialogProvider>
      </BarcodeScannerProvider>
    </BrandProvider>
    </RealtimeProvider>
    </FeatureGateProvider>
  )
}
