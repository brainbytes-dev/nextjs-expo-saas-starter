import { test } from "@playwright/test"
import { loginAsDemoUser } from "./helpers/auth"

const PAGES = [
  { name: "dashboard", path: "/dashboard", wait: 2000 },
  { name: "materials", path: "/dashboard/materials", wait: 1500 },
  { name: "deliveries", path: "/dashboard/deliveries", wait: 1500 },
  { name: "time-tracking", path: "/dashboard/time-tracking", wait: 1500 },
  { name: "supply-chain", path: "/dashboard/supply-chain", wait: 2000 },
  { name: "maintenance-ai", path: "/dashboard/maintenance-ai", wait: 1500 },
  { name: "settings", path: "/dashboard/settings", wait: 1000 },
  { name: "tv-mode", path: "/tv", wait: 2000 },
]

const LANDING = { name: "landing", path: "/", wait: 1500 }

for (const theme of ["light", "dark"] as const) {
  test.describe(`Screenshots — ${theme} mode`, () => {
    // Landing page (no auth)
    test(`${LANDING.name}-${theme}`, async ({ page }) => {
      if (theme === "dark") {
        await page.emulateMedia({ colorScheme: "dark" })
      } else {
        await page.emulateMedia({ colorScheme: "light" })
      }
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(LANDING.path, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(LANDING.wait)
      await page.screenshot({
        path: `screenshots/${LANDING.name}-${theme}.png`,
        fullPage: false,
      })
    })

    // Dashboard pages (auth required)
    for (const pg of PAGES) {
      test(`${pg.name}-${theme}`, async ({ page }) => {
        if (theme === "dark") {
          await page.emulateMedia({ colorScheme: "dark" })
        } else {
          await page.emulateMedia({ colorScheme: "light" })
        }
        await page.setViewportSize({ width: 1440, height: 900 })
        await loginAsDemoUser(page)
        // Set theme via localStorage before navigating
        await page.evaluate((t) => {
          localStorage.setItem("theme", t)
          document.documentElement.classList.toggle("dark", t === "dark")
        }, theme)
        await page.goto(pg.path, { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(pg.wait)
        await page.screenshot({
          path: `screenshots/${pg.name}-${theme}.png`,
          fullPage: false,
        })
      })
    }
  })
}
