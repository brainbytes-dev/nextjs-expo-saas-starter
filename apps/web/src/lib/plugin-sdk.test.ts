import { describe, it, expect } from "vitest"
import { BUILTIN_PLUGINS, getBuiltinPlugin } from "@/lib/plugin-registry"
import type { PluginManifest } from "@/lib/plugin-sdk"

const VALID_CATEGORIES = ["import", "export", "integration", "utility"] as const

describe("plugin-registry", () => {
  describe("BUILTIN_PLUGINS", () => {
    it("has exactly 3 entries", () => {
      expect(BUILTIN_PLUGINS).toHaveLength(3)
    })

    it("each plugin has required fields", () => {
      for (const plugin of BUILTIN_PLUGINS) {
        expect(plugin.slug).toBeTruthy()
        expect(typeof plugin.slug).toBe("string")

        expect(plugin.name).toBeTruthy()
        expect(typeof plugin.name).toBe("string")

        expect(plugin.description).toBeTruthy()
        expect(typeof plugin.description).toBe("string")

        expect(plugin.version).toBeTruthy()
        expect(plugin.author).toBeTruthy()
        expect(plugin.icon).toBeTruthy()

        expect(plugin.category).toBeTruthy()
        expect(Array.isArray(plugin.events)).toBe(true)
        expect(plugin.events.length).toBeGreaterThan(0)
        expect(Array.isArray(plugin.configSchema)).toBe(true)
      }
    })

    it("each plugin has a valid category", () => {
      for (const plugin of BUILTIN_PLUGINS) {
        expect(VALID_CATEGORIES).toContain(plugin.category)
      }
    })

    it("all plugins are marked as builtin", () => {
      for (const plugin of BUILTIN_PLUGINS) {
        expect(plugin.isBuiltin).toBe(true)
      }
    })

    it("all slugs are unique", () => {
      const slugs = BUILTIN_PLUGINS.map((p) => p.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    })

    it("contains expected plugins", () => {
      const slugs = BUILTIN_PLUGINS.map((p) => p.slug)
      expect(slugs).toContain("csv-import-pro")
      expect(slugs).toContain("barcode-label-designer")
      expect(slugs).toContain("slack-notifications")
    })
  })

  describe("plugin events", () => {
    it("each event has name and label", () => {
      for (const plugin of BUILTIN_PLUGINS) {
        for (const event of plugin.events) {
          expect(event.name).toBeTruthy()
          expect(typeof event.name).toBe("string")
          expect(event.label).toBeTruthy()
          expect(typeof event.label).toBe("string")
        }
      }
    })
  })

  describe("getBuiltinPlugin", () => {
    it("finds a plugin by slug", () => {
      const plugin = getBuiltinPlugin("csv-import-pro")
      expect(plugin).toBeDefined()
      expect(plugin!.name).toBe("CSV Import Pro")
    })

    it("returns undefined for unknown slug", () => {
      expect(getBuiltinPlugin("nonexistent")).toBeUndefined()
    })
  })

  describe("plugin categories", () => {
    it("csv-import-pro is in import category", () => {
      const plugin = getBuiltinPlugin("csv-import-pro")
      expect(plugin!.category).toBe("import")
    })

    it("barcode-label-designer is in utility category", () => {
      const plugin = getBuiltinPlugin("barcode-label-designer")
      expect(plugin!.category).toBe("utility")
    })

    it("slack-notifications is in integration category", () => {
      const plugin = getBuiltinPlugin("slack-notifications")
      expect(plugin!.category).toBe("integration")
    })
  })
})
