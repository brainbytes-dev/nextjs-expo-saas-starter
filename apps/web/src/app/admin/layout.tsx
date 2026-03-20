"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"

// Better-Auth admin plugin adds 'role' to user but types need explicit cast
interface SessionUser {
  role?: string
  [key: string]: unknown
}

const NAV_ITEMS = [
  { href: "/admin", label: "Uebersicht" },
  { href: "/admin/organizations", label: "Organisationen" },
  { href: "/admin/users", label: "Benutzer" },
  { href: "/admin/payments", label: "Umsatz" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const user = session?.user as SessionUser | undefined

  useEffect(() => {
    if (!isPending && (!user || user.role !== "admin")) {
      router.replace("/dashboard")
    }
  }, [user, isPending, router])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/admin" className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold">LogistikApp</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Admin
              </span>
            </a>
            <nav className="flex gap-4 text-sm">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href)
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </a>
                )
              })}
            </nav>
          </div>
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Zurueck zum Dashboard
          </a>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
