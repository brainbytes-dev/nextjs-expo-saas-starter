"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import {
  IconDeviceFloppy,
  IconDownload,
  IconGripVertical,
  IconLetterT,
  IconBarcode,
  IconQrcode,
  IconPhoto,
  IconLine,
  IconSquare,
  IconTrash,
  IconFileTypePng,
  IconCode,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type {
  LabelElement,
  LabelElementType,
  DataBinding,
} from "@/lib/label-designer-types"
import {
  LABEL_SIZES,
  DATA_BINDING_OPTIONS,
  SAMPLE_DATA,
} from "@/lib/label-designer-types"
import { labelToZpl, renderLabelToCanvas } from "@/lib/label-to-zpl"

// ─── Reducer ────────────────────────────────────────────────────────

type Action =
  | { type: "ADD_ELEMENT"; element: LabelElement }
  | { type: "UPDATE_ELEMENT"; id: string; changes: Partial<LabelElement> }
  | { type: "REMOVE_ELEMENT"; id: string }
  | { type: "SELECT_ELEMENT"; id: string | null }
  | { type: "SET_ELEMENTS"; elements: LabelElement[] }
  | { type: "SET_SIZE"; width: number; height: number }

interface State {
  elements: LabelElement[]
  selectedId: string | null
  width: number
  height: number
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_ELEMENT":
      return {
        ...state,
        elements: [...state.elements, action.element],
        selectedId: action.element.id,
      }
    case "UPDATE_ELEMENT":
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.id ? { ...el, ...action.changes } : el
        ),
      }
    case "REMOVE_ELEMENT":
      return {
        ...state,
        elements: state.elements.filter((el) => el.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }
    case "SELECT_ELEMENT":
      return { ...state, selectedId: action.id }
    case "SET_ELEMENTS":
      return { ...state, elements: action.elements, selectedId: null }
    case "SET_SIZE":
      return { ...state, width: action.width, height: action.height }
    default:
      return state
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function createDefaultElement(type: LabelElementType, width: number): LabelElement {
  const base = {
    id: nanoid(8),
    type,
    x: 2,
    y: 2,
    width: Math.min(30, width - 4),
    height: 8,
  }

  switch (type) {
    case "text":
      return { ...base, content: "Text", fontSize: 12, fontWeight: "normal", textAlign: "left", dataBinding: "custom_text" }
    case "barcode":
      return { ...base, height: 12, content: "1234567890", barcodeFormat: "code128", dataBinding: "material_barcode" }
    case "qrcode":
      return { ...base, width: 20, height: 20, content: "https://logistikapp.ch", dataBinding: "material_barcode" }
    case "image":
      return { ...base, width: 15, height: 15, imageUrl: "" }
    case "line":
      return { ...base, height: 1, strokeWidth: 1 }
    case "rectangle":
      return { ...base, height: 12, strokeWidth: 1 }
    default:
      return base
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function LabelDesignerPage() {
  const [state, dispatch] = React.useReducer(reducer, {
    elements: [],
    selectedId: null,
    width: 100,
    height: 50,
  })

  const [templateName, setTemplateName] = React.useState("Neue Vorlage")
  const [savedTemplates, setSavedTemplates] = React.useState<Array<{
    id: string
    name: string
    width: number
    height: number
    elements: LabelElement[]
  }>>([])
  const [saving, setSaving] = React.useState(false)
  const [zplDialog, setZplDialog] = React.useState(false)
  const [zplCode, setZplCode] = React.useState("")

  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const selectedElement = state.elements.find((el) => el.id === state.selectedId)

  // Scale: pixels per mm
  const CANVAS_SCALE = 4

  // Load saved templates
  React.useEffect(() => {
    fetch("/api/label-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setSavedTemplates(data)
      })
      .catch(() => {})
  }, [])

  // Redraw canvas on state changes
  React.useEffect(() => {
    if (!canvasRef.current) return
    renderLabelToCanvas(
      canvasRef.current,
      { name: templateName, width: state.width, height: state.height, elements: state.elements },
      SAMPLE_DATA,
      CANVAS_SCALE
    )
  }, [state.elements, state.width, state.height, templateName])

  const handleAddElement = (type: LabelElementType) => {
    dispatch({
      type: "ADD_ELEMENT",
      element: createDefaultElement(type, state.width),
    })
  }

  const handleSaveTemplate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/label-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          width: state.width,
          height: state.height,
          elements: state.elements,
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        setSavedTemplates((prev) => [...prev, saved])
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleLoadTemplate = (t: typeof savedTemplates[number]) => {
    setTemplateName(t.name)
    dispatch({ type: "SET_SIZE", width: t.width, height: t.height })
    dispatch({ type: "SET_ELEMENTS", elements: t.elements as LabelElement[] })
  }

  const handleExportZpl = () => {
    const code = labelToZpl(
      { name: templateName, width: state.width, height: state.height, elements: state.elements },
      SAMPLE_DATA
    )
    setZplCode(code)
    setZplDialog(true)
  }

  const handleExportPng = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `${templateName.replace(/\s+/g, "_")}.png`
    a.click()
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = (e.clientX - rect.left) / rect.width * state.width
    const clickY = (e.clientY - rect.top) / rect.height * state.height

    // Find element under click
    const clicked = [...state.elements].reverse().find((el) =>
      clickX >= el.x && clickX <= el.x + el.width &&
      clickY >= el.y && clickY <= el.y + el.height
    )
    dispatch({ type: "SELECT_ELEMENT", id: clicked?.id ?? null })
  }

  const handleSizeChange = (sizeStr: string) => {
    const size = LABEL_SIZES.find((s) => `${s.width}x${s.height}` === sizeStr)
    if (size) {
      dispatch({ type: "SET_SIZE", width: size.width, height: size.height })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Etiketten-Designer</h2>
          <p className="text-muted-foreground">
            Erstelle benutzerdefinierte Barcode-Etiketten per Drag & Drop
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportZpl}>
            <IconCode className="mr-2 size-4" />
            ZPL exportieren
          </Button>
          <Button variant="outline" onClick={handleExportPng}>
            <IconFileTypePng className="mr-2 size-4" />
            PNG exportieren
          </Button>
          <Button onClick={handleSaveTemplate} disabled={saving}>
            <IconDeviceFloppy className="mr-2 size-4" />
            {saving ? "Speichere..." : "Als Vorlage speichern"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr_280px] gap-4">
        {/* Left Panel — Toolbox */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Elemente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { type: "text" as const, icon: IconLetterT, label: "Text" },
                { type: "barcode" as const, icon: IconBarcode, label: "Barcode (Code128)" },
                { type: "qrcode" as const, icon: IconQrcode, label: "QR-Code" },
                { type: "image" as const, icon: IconPhoto, label: "Bild" },
                { type: "line" as const, icon: IconLine, label: "Linie" },
                { type: "rectangle" as const, icon: IconSquare, label: "Rechteck" },
              ].map((item) => (
                <Button
                  key={item.type}
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAddElement(item.type)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Etikettengrösse</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={`${state.width}x${state.height}`}
                onValueChange={handleSizeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((s) => (
                    <SelectItem key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Saved templates */}
          {savedTemplates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gespeicherte Vorlagen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {savedTemplates.map((t) => (
                  <Button
                    key={t.id}
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => handleLoadTemplate(t)}
                  >
                    <IconDownload className="mr-2 size-3.5" />
                    {t.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center — Canvas */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-center font-medium max-w-xs"
            />
            <Badge variant="secondary">
              {state.width} x {state.height} mm
            </Badge>
          </div>

          <div className="relative rounded-lg border bg-white shadow-sm p-4">
            <canvas
              ref={canvasRef}
              width={state.width * CANVAS_SCALE}
              height={state.height * CANVAS_SCALE}
              onClick={handleCanvasClick}
              className="cursor-crosshair"
              style={{
                width: state.width * CANVAS_SCALE,
                height: state.height * CANVAS_SCALE,
                maxWidth: "100%",
              }}
            />
          </div>

          {/* Element list */}
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ebenen ({state.elements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {state.elements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Klicke links auf ein Element, um es hinzuzufügen.
                </p>
              ) : (
                <div className="space-y-1">
                  {state.elements.map((el) => (
                    <div
                      key={el.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                        el.id === state.selectedId
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => dispatch({ type: "SELECT_ELEMENT", id: el.id })}
                    >
                      <IconGripVertical className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {el.type === "text" ? (el.content || "Text") : el.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {el.x},{el.y}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          dispatch({ type: "REMOVE_ELEMENT", id: el.id })
                        }}
                        className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive"
                      >
                        <IconTrash className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — Properties */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Eigenschaften</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedElement ? (
                <div className="space-y-3">
                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">X (mm)</Label>
                      <Input
                        type="number"
                        value={selectedElement.x}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { x: Number(e.target.value) },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Y (mm)</Label>
                      <Input
                        type="number"
                        value={selectedElement.y}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { y: Number(e.target.value) },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Breite (mm)</Label>
                      <Input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { width: Number(e.target.value) },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Höhe (mm)</Label>
                      <Input
                        type="number"
                        value={selectedElement.height}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { height: Number(e.target.value) },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Data binding */}
                  {(selectedElement.type === "text" ||
                    selectedElement.type === "barcode" ||
                    selectedElement.type === "qrcode") && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Datenbindung</Label>
                      <Select
                        value={selectedElement.dataBinding ?? "custom_text"}
                        onValueChange={(v) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: {
                              dataBinding: v as DataBinding,
                              content:
                                v !== "custom_text"
                                  ? SAMPLE_DATA[v as DataBinding]
                                  : selectedElement.content,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_BINDING_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Content */}
                  {(selectedElement.type === "text" ||
                    selectedElement.type === "barcode" ||
                    selectedElement.type === "qrcode") && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Inhalt / Vorschautext</Label>
                      <Input
                        value={selectedElement.content ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { content: e.target.value },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  )}

                  {/* Text properties */}
                  {selectedElement.type === "text" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Schriftgrösse (pt)</Label>
                          <Input
                            type="number"
                            value={selectedElement.fontSize ?? 12}
                            onChange={(e) =>
                              dispatch({
                                type: "UPDATE_ELEMENT",
                                id: selectedElement.id,
                                changes: { fontSize: Number(e.target.value) },
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Schriftstärke</Label>
                          <Select
                            value={selectedElement.fontWeight ?? "normal"}
                            onValueChange={(v) =>
                              dispatch({
                                type: "UPDATE_ELEMENT",
                                id: selectedElement.id,
                                changes: { fontWeight: v as "normal" | "bold" },
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Fett</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ausrichtung</Label>
                        <Select
                          value={selectedElement.textAlign ?? "left"}
                          onValueChange={(v) =>
                            dispatch({
                              type: "UPDATE_ELEMENT",
                              id: selectedElement.id,
                              changes: { textAlign: v as "left" | "center" | "right" },
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Links</SelectItem>
                            <SelectItem value="center">Zentriert</SelectItem>
                            <SelectItem value="right">Rechts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Barcode format */}
                  {selectedElement.type === "barcode" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Barcode-Format</Label>
                      <Select
                        value={selectedElement.barcodeFormat ?? "code128"}
                        onValueChange={(v) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { barcodeFormat: v as "code128" | "ean13" | "code39" },
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="code128">Code 128</SelectItem>
                          <SelectItem value="ean13">EAN-13</SelectItem>
                          <SelectItem value="code39">Code 39</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Stroke width for line/rectangle */}
                  {(selectedElement.type === "line" || selectedElement.type === "rectangle") && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Linienstärke (mm)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={selectedElement.strokeWidth ?? 1}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { strokeWidth: Number(e.target.value) },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  )}

                  {/* Image URL */}
                  {selectedElement.type === "image" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Bild-URL</Label>
                      <Input
                        value={selectedElement.imageUrl ?? ""}
                        placeholder="https://..."
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_ELEMENT",
                            id: selectedElement.id,
                            changes: { imageUrl: e.target.value },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  )}

                  <Separator />

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      dispatch({ type: "REMOVE_ELEMENT", id: selectedElement.id })
                    }
                  >
                    <IconTrash className="mr-2 size-3.5" />
                    Element entfernen
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Wähle ein Element auf der Arbeitsfläche aus, um dessen Eigenschaften zu bearbeiten.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ZPL Export Dialog */}
      <Dialog open={zplDialog} onOpenChange={setZplDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ZPL-Code (Zebra Drucker)</DialogTitle>
          </DialogHeader>
          <Textarea
            value={zplCode}
            readOnly
            rows={16}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(zplCode)
              }}
            >
              In Zwischenablage kopieren
            </Button>
            <Button
              onClick={() => {
                const blob = new Blob([zplCode], { type: "text/plain" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `${templateName.replace(/\s+/g, "_")}.zpl`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <IconDownload className="mr-2 size-4" />
              Herunterladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
