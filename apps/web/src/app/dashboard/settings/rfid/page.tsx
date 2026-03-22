"use client"

import { useTranslations } from "next-intl"

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconAntenna,
  IconDeviceDesktop,
  IconWifi,
  IconWifiOff,
  IconTrash,
  IconCheck,
  IconRefresh,
} from "@tabler/icons-react"
import {
  type RfidTag,
  type RfidReaderConfig,
  type NetworkReaderConnection,
  type TagMapping,
  parseEPC,
  isValidEPC,
  connectNetworkReader,
  loadRfidConfig,
  saveRfidConfig,
  loadTagMappings,
  saveTagMapping,
  removeTagMapping,
} from "@/lib/rfid-reader"

// ---------------------------------------------------------------------------
// RFID Settings Page — /dashboard/settings/rfid
// ---------------------------------------------------------------------------

export default function RfidSettingsPage() {
  const ts = useTranslations("settings")
  // ── Config State (lazy-initialized from localStorage) ────────────────────
  const [config, setConfig] = useState<RfidReaderConfig>(() => loadRfidConfig())
  const [host, setHost] = useState(() => {
    const saved = loadRfidConfig()
    return saved.host || ""
  })
  const [port, setPort] = useState(() => {
    const saved = loadRfidConfig()
    return saved.port ? String(saved.port) : "8080"
  })

  // ── Connection State ─────────────────────────────────────────────────────
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const connectionRef = useRef<NetworkReaderConnection | null>(null)

  // ── Tag Log ──────────────────────────────────────────────────────────────
  const [tagLog, setTagLog] = useState<RfidTag[]>([])

  // ── Tag Mappings ─────────────────────────────────────────────────────────
  const [mappings, setMappings] = useState<TagMapping[]>(() => loadTagMappings())
  const [mappingEpc, setMappingEpc] = useState("")
  const [mappingType, setMappingType] = useState<"material" | "tool" | "location">("material")
  const [mappingAssetId, setMappingAssetId] = useState("")
  const [mappingAssetName, setMappingAssetName] = useState("")

  // ── Listen for RFID tag read events ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const tag = (e as CustomEvent<RfidTag>).detail
      if (tag) {
        setTagLog((prev) => [tag, ...prev].slice(0, 50))
      }
    }
    window.addEventListener("rfid-tag-read", handler)
    return () => window.removeEventListener("rfid-tag-read", handler)
  }, [])

  // ── Connection Type Change ───────────────────────────────────────────────
  const handleTypeChange = useCallback(
    (type: "keyboard_wedge" | "network") => {
      const newConfig: RfidReaderConfig = { type }
      if (type === "network") {
        newConfig.host = host || "192.168.1.100"
        newConfig.port = parseInt(port, 10) || 8080
      }
      setConfig(newConfig)
      saveRfidConfig(newConfig)

      // Disconnect if switching away from network
      if (type !== "network" && connectionRef.current) {
        connectionRef.current.disconnect()
        connectionRef.current = null
        setConnected(false)
      }
    },
    [host, port]
  )

  // ── Connect to Network Reader ────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    // Disconnect existing
    if (connectionRef.current) {
      connectionRef.current.disconnect()
      connectionRef.current = null
    }

    setConnecting(true)
    setConnected(false)

    const readerHost = host || "192.168.1.100"
    const readerPort = parseInt(port, 10) || 8080

    const conn = connectNetworkReader(readerHost, readerPort)
    connectionRef.current = conn

    conn.ws.onopen = () => {
      setConnected(true)
      setConnecting(false)
      // Save successful config
      const newConfig: RfidReaderConfig = {
        type: "network",
        host: readerHost,
        port: readerPort,
      }
      setConfig(newConfig)
      saveRfidConfig(newConfig)
    }

    conn.ws.onclose = () => {
      setConnected(false)
      setConnecting(false)
    }

    conn.ws.onerror = () => {
      setConnected(false)
      setConnecting(false)
    }
  }, [host, port])

  // ── Disconnect ───────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.disconnect()
      connectionRef.current = null
    }
    setConnected(false)
  }, [])

  // ── Add Tag Mapping ──────────────────────────────────────────────────────
  const handleAddMapping = useCallback(() => {
    if (!mappingEpc || !mappingAssetName) return

    const mapping: TagMapping = {
      epc: mappingEpc.replace(/[\s-]/g, "").toUpperCase(),
      assetType: mappingType,
      assetId: mappingAssetId || crypto.randomUUID(),
      assetName: mappingAssetName,
      mappedAt: new Date().toISOString(),
    }

    saveTagMapping(mapping)
    setMappings(loadTagMappings())
    setMappingEpc("")
    setMappingAssetId("")
    setMappingAssetName("")
  }, [mappingEpc, mappingType, mappingAssetId, mappingAssetName])

  // ── Remove Tag Mapping ───────────────────────────────────────────────────
  const handleRemoveMapping = useCallback((epc: string) => {
    removeTagMapping(epc)
    setMappings(loadTagMappings())
  }, [])

  // ── Use scanned tag for mapping ──────────────────────────────────────────
  const applyTagForMapping = useCallback((epc: string) => {
    setMappingEpc(epc)
  }, [])

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ts("rfidTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {ts("rfidSubtitle")}
        </p>
      </div>

      {/* ── Verbindungstyp ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAntenna className="size-5" />
            Verbindungstyp
          </CardTitle>
          <CardDescription>
            {ts("connectionTypeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Keyboard-Wedge */}
            <button
              type="button"
              onClick={() => handleTypeChange("keyboard_wedge")}
              className={
                "relative rounded-lg border-2 p-4 text-left transition-colors " +
                (config.type === "keyboard_wedge"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/40")
              }
            >
              {config.type === "keyboard_wedge" && (
                <div className="absolute right-3 top-3">
                  <IconCheck className="size-5 text-primary" />
                </div>
              )}
              <IconDeviceDesktop className="size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">{ts("keyboardWedge")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ts("keyboardWedgeDesc")}
              </p>
            </button>

            {/* Netzwerk */}
            <button
              type="button"
              onClick={() => handleTypeChange("network")}
              className={
                "relative rounded-lg border-2 p-4 text-left transition-colors " +
                (config.type === "network"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/40")
              }
            >
              {config.type === "network" && (
                <div className="absolute right-3 top-3">
                  <IconCheck className="size-5 text-primary" />
                </div>
              )}
              <IconWifi className="size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">{ts("networkWs")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ts("networkWsDesc")}
              </p>
            </button>
          </div>

          {/* ── Network config ── */}
          {config.type === "network" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rfid-host">{ts("hostIp")}</Label>
                    <Input
                      id="rfid-host"
                      placeholder="192.168.1.100"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rfid-port">{ts("port")}</Label>
                    <Input
                      id="rfid-port"
                      type="number"
                      placeholder="8080"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {connected ? (
                    <Button variant="destructive" onClick={handleDisconnect}>
                      <IconWifiOff className="mr-2 size-4" />
                      Trennen
                    </Button>
                  ) : (
                    <Button onClick={handleConnect} disabled={connecting}>
                      <IconWifi className="mr-2 size-4" />
                      {connecting ? ts("connecting") : ts("connect")}
                    </Button>
                  )}

                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    <div
                      className={
                        "size-2.5 rounded-full " +
                        (connected
                          ? "bg-green-500 animate-pulse"
                          : connecting
                            ? "bg-yellow-500 animate-pulse"
                            : "bg-red-500")
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {connected
                        ? ts("connected")
                        : connecting
                          ? ts("connecting")
                          : ts("disconnected")}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Keyboard-Wedge info ── */}
          {config.type === "keyboard_wedge" && (
            <>
              <Separator />
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Keyboard-Wedge-Modus
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ts("keyboardWedgeModeDesc")}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Tag-Log ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{ts("tagLog")}</CardTitle>
              <CardDescription>
                {ts("tagLogDesc")}
              </CardDescription>
            </div>
            {tagLog.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTagLog([])}
              >
                <IconRefresh className="mr-2 size-4" />
                Leeren
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tagLog.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <IconAntenna className="size-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-lg font-medium text-muted-foreground">
                {ts("waitingForTags")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {config.type === "keyboard_wedge"
                  ? ts("scanRfidTag")
                  : connected
                    ? ts("tagsAutoDetected")
                    : ts("connectReaderFirst")}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tagLog.map((tag, i) => {
                const parsed = parseEPC(tag.epc)
                const mapping = mappings.find((m) => m.epc === tag.epc)
                return (
                  <div
                    key={`${tag.epc}-${tag.timestamp}-${i}`}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium truncate">
                          {tag.epc}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {parsed.type}
                        </Badge>
                        {mapping && (
                          <Badge variant="default" className="text-xs shrink-0">
                            {mapping.assetName}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {tag.rssi !== 0 && <span>RSSI: {tag.rssi} dBm</span>}
                        {tag.antennaPort && <span>{ts("antenna")}: {tag.antennaPort}</span>}
                        <span>
                          {new Date(tag.timestamp).toLocaleTimeString("de-CH")}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyTagForMapping(tag.epc)}
                      title={ts("assignTag")}
                    >
                      Zuweisen
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tag zuweisen ── */}
      <Card>
        <CardHeader>
          <CardTitle>{ts("assignTag")}</CardTitle>
          <CardDescription>
            {ts("assignTagDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapping-epc">{ts("epcCode")}</Label>
              <Input
                id="mapping-epc"
                placeholder="E2003412012345670000ABCD"
                value={mappingEpc}
                onChange={(e) => setMappingEpc(e.target.value)}
                className="font-mono"
              />
              {mappingEpc && !isValidEPC(mappingEpc) && (
                <p className="text-xs text-destructive">
                  {ts("invalidEpc")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping-type">{ts("typeLabel")}</Label>
              <Select
                value={mappingType}
                onValueChange={(v) =>
                  setMappingType(v as "material" | "tool" | "location")
                }
              >
                <SelectTrigger id="mapping-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">{ts("materialType")}</SelectItem>
                  <SelectItem value="tool">{ts("toolType")}</SelectItem>
                  <SelectItem value="location">{ts("locationType")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapping-name">{ts("designation")}</Label>
              <Input
                id="mapping-name"
                placeholder=ts("designationPlaceholder")
                value={mappingAssetName}
                onChange={(e) => setMappingAssetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping-id">{ts("assetIdOptional")}</Label>
              <Input
                id="mapping-id"
                placeholder=ts("autoGenerated")
                value={mappingAssetId}
                onChange={(e) => setMappingAssetId(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleAddMapping}
            disabled={!mappingEpc || !mappingAssetName || !isValidEPC(mappingEpc)}
          >
            <IconCheck className="mr-2 size-4" />
            Tag zuweisen
          </Button>
        </CardContent>
      </Card>

      {/* ── Bestehende Zuweisungen ── */}
      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{ts("assignedTags")}</CardTitle>
            <CardDescription>
              {ts("tagsAssigned", { count: mappings.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mappings.map((m) => (
                <div
                  key={m.epc}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.assetName}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {m.assetType === "material"
                          ? ts("materialType")
                          : m.assetType === "tool"
                            ? ts("toolType")
                            : ts("locationType")}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                      {m.epc}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMapping(m.epc)}
                    title=ts("removeAssignment")
                  >
                    <IconTrash className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Kompatible Reader ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconDeviceDesktop className="size-5" />
            Unterstützte Reader
          </CardTitle>
          <CardDescription>
            {ts("supportedReadersDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                brand: "Zebra",
                models: "MC3300, FX7500, FX9600",
                mode: "USB HID / Network",
              },
              {
                brand: "Impinj",
                models: "Speedway R420, R700, xSpan",
                mode: "Network (LLRP)",
              },
              {
                brand: "ThingMagic",
                models: "M6e, Sargas, Izar",
                mode: "USB HID / Network",
              },
            ].map((r) => (
              <div key={r.brand} className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">{r.brand}</p>
                <p className="text-sm text-muted-foreground">{r.models}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.mode}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Hinweis
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ts("rfidNoteText")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
