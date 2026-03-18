"use client"

import Link from "next/link"
import {
  IconPackage,
  IconTool,
  IconKey,
  IconClipboardList,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function QuickActionsWidget() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle>Schnellaktionen</CardTitle>
        <CardDescription>Häufig verwendete Funktionen</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 flex-1">
        <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
          <Link href="/dashboard/materials/new">
            <span className="flex size-6 items-center justify-center rounded bg-blue-500/10">
              <IconPackage className="size-3.5 text-blue-500" />
            </span>
            Material erfassen
          </Link>
        </Button>
        <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
          <Link href="/dashboard/tools/new">
            <span className="flex size-6 items-center justify-center rounded bg-emerald-500/10">
              <IconTool className="size-3.5 text-emerald-600" />
            </span>
            Werkzeug erfassen
          </Link>
        </Button>
        <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
          <Link href="/dashboard/keys/new">
            <span className="flex size-6 items-center justify-center rounded bg-amber-500/10">
              <IconKey className="size-3.5 text-amber-600" />
            </span>
            Schlüssel erfassen
          </Link>
        </Button>
        <Separator className="my-1" />
        <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
          <Link href="/dashboard/commissions">
            <span className="flex size-6 items-center justify-center rounded bg-primary/10">
              <IconClipboardList className="size-3.5 text-primary" />
            </span>
            Lieferschein erstellen
          </Link>
        </Button>
        <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
          <Link href="/dashboard/history/stock-changes">
            <span className="flex size-6 items-center justify-center rounded bg-muted">
              <IconEdit className="size-3.5 text-muted-foreground" />
            </span>
            Bestandsänderung buchen
          </Link>
        </Button>
      </CardContent>
      <CardFooter className="pt-0 shrink-0">
        <Button variant="default" className="w-full gap-1.5" asChild>
          <Link href="/dashboard/materials/new">
            <IconPlus className="size-4" />
            Neues Element anlegen
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
