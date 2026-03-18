"use client"

import { useState } from "react"

interface Props {
  item: {
    id: string
    name: string
    type: "tool" | "material"
    barcode: string | null
  }
  isAvailable: boolean
}

type ActionType = "checkout" | "report" | null

export function SelfServiceActions({ item, isAvailable }: Props) {
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setActiveAction(null)
    setName("")
    setCode("")
    setNotes("")
    setError(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Bitte gib deinen Namen ein.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/self-service/${item.barcode ?? item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: activeAction,
          name: name.trim(),
          code: code.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Fehler beim Senden")
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="font-semibold text-gray-900">
          {activeAction === "checkout" ? "Entnehme bestätigt!" : "Problem gemeldet!"}
        </p>
        <p className="text-sm text-gray-500">
          {activeAction === "checkout"
            ? "Die Entnahme wurde erfasst. Bitte bringe den Artikel zurück, sobald du fertig bist."
            : "Danke für die Meldung. Das Team wird sich darum kümmern."}
        </p>
        <button
          onClick={reset}
          className="mt-2 text-sm text-blue-600 underline underline-offset-2"
        >
          Neue Aktion
        </button>
      </div>
    )
  }

  if (activeAction) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">
          {activeAction === "checkout" ? "Werkzeug entnehmen" : "Problem melden"}
        </h2>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Dein Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {activeAction === "checkout" && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Mitarbeiter-Code (optional)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="z. B. MA-042"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {activeAction === "report" && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Problembeschreibung
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Was ist das Problem?"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={reset}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Wird gesendet…" : "Senden"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isAvailable && item.type === "tool" && (
        <button
          onClick={() => setActiveAction("checkout")}
          className="w-full rounded-2xl bg-gray-900 py-4 text-base font-semibold text-white shadow-sm hover:bg-gray-700 active:scale-[0.98] transition-transform"
        >
          🔑 Werkzeug entnehmen
        </button>
      )}

      <button
        onClick={() => setActiveAction("report")}
        className="w-full rounded-2xl border border-gray-300 bg-white py-4 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-transform"
      >
        ⚠️ Problem melden
      </button>
    </div>
  )
}
