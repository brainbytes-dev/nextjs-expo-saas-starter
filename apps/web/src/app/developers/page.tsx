import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";

// ─── Static code examples ─────────────────────────────────────────────────────

const CURL_EXAMPLE = `curl -X GET "https://app.logistikapp.ch/api/v1/materials?limit=20" \\
  -H "Authorization: Bearer lapp_live_<dein-schluessel>"`;

const JS_EXAMPLE = `const res = await fetch("https://app.logistikapp.ch/api/v1/materials", {
  headers: {
    Authorization: "Bearer lapp_live_<dein-schluessel>",
  },
});

const { data, pagination } = await res.json();
console.log(data);`;

const PYTHON_EXAMPLE = `import requests

headers = {"Authorization": "Bearer lapp_live_<dein-schluessel>"}
res = requests.get(
    "https://app.logistikapp.ch/api/v1/materials",
    headers=headers,
)
print(res.json())`;

const TOOLS_EXAMPLE = `curl -X GET "https://app.logistikapp.ch/api/v1/tools?limit=50&search=bosch" \\
  -H "Authorization: Bearer lapp_live_<dein-schluessel>"`;

// ─── Components ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {lang}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed bg-background">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-lg font-semibold tracking-tight scroll-mt-8 mt-10 mb-4"
    >
      {children}
    </h2>
  );
}

// ─── Endpoint table ───────────────────────────────────────────────────────────

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/materials",
    scope: "materials:read",
    description: "Materialien auflisten",
    params: "page, limit, search, groupId",
  },
  {
    method: "GET",
    path: "/api/v1/tools",
    scope: "tools:read",
    description: "Werkzeuge auflisten",
    params: "page, limit, search, groupId, assignedToId",
  },
] as const;

const SCOPES = [
  { id: "materials:read", label: "Materialien lesen" },
  { id: "materials:write", label: "Materialien schreiben" },
  { id: "tools:read", label: "Werkzeuge lesen" },
  { id: "tools:write", label: "Werkzeuge schreiben" },
  { id: "keys:read", label: "Schlüssel lesen" },
  { id: "locations:read", label: "Lagerorte lesen" },
  { id: "stock:read", label: "Bestand lesen" },
  { id: "*", label: "Vollzugriff (alle Scopes)" },
] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: "border-blue-500/30 text-blue-600 bg-blue-500/10",
  POST: "border-green-500/30 text-green-600 bg-green-500/10",
  PATCH: "border-yellow-500/30 text-yellow-600 bg-yellow-500/10",
  DELETE: "border-red-500/30 text-red-600 bg-red-500/10",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity"
            >
              LogistikApp
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm text-muted-foreground">Entwickler-Dokumentation</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 lg:py-14">
        <div className="grid lg:grid-cols-[220px_1fr] gap-10">
          {/* Sidebar nav */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20 space-y-1">
              {[
                { href: "#overview", label: "Übersicht" },
                { href: "#authentication", label: "Authentifizierung" },
                { href: "#rate-limiting", label: "Rate Limiting" },
                { href: "#endpoints", label: "Endpunkte" },
                { href: "#scopes", label: "Scopes" },
                { href: "#examples", label: "Code-Beispiele" },
                { href: "#response-format", label: "Antwortformat" },
                { href: "#errors", label: "Fehlerbehandlung" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-muted/50"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0 space-y-2">
            {/* Overview */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                REST API v1
              </p>
              <h1 id="overview" className="text-3xl font-semibold tracking-tight">
                Entwickler-Dokumentation
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                Die LogistikApp REST API ermöglicht den programmatischen Zugriff auf
                deine Inventardaten. Integriere LogistikApp mit Zapier, Make, eigenen
                Skripten oder deiner ERP-Software.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              {[
                { label: "Basis-URL", value: "https://app.logistikapp.ch/api/v1" },
                { label: "Authentifizierung", value: "Bearer Token (API-Key)" },
                { label: "Antwortformat", value: "JSON (UTF-8)" },
              ].map((item) => (
                <Card key={item.label} className="p-4">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-mono font-medium break-all">{item.value}</p>
                </Card>
              ))}
            </div>

            {/* Authentication */}
            <SectionHeading id="authentication">Authentifizierung</SectionHeading>
            <Card>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Alle API-Anfragen erfordern einen API-Schlüssel im{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded border border-border">
                    Authorization
                  </code>{" "}
                  Header. API-Schlüssel beginnen immer mit{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded border border-border">
                    lapp_live_
                  </code>
                  .
                </p>
                <CodeBlock
                  lang="HTTP Header"
                  code={`Authorization: Bearer lapp_live_a3f7c2e1b8d940528f3...`}
                />
                <p className="text-sm text-muted-foreground">
                  API-Schlüssel kannst du unter{" "}
                  <Link
                    href="/dashboard/settings/api-keys"
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    Einstellungen → API-Schlüssel
                  </Link>{" "}
                  erstellen. Jeder Schlüssel hat einen oder mehrere Scopes, die
                  bestimmen, auf welche Ressourcen zugegriffen werden darf.
                </p>
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <SectionHeading id="rate-limiting">Rate Limiting</SectionHeading>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Limit
                    </p>
                    <p className="text-2xl font-semibold">100</p>
                    <p className="text-xs text-muted-foreground">
                      Anfragen pro Minute pro API-Schlüssel
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Bei Überschreitung
                    </p>
                    <p className="text-2xl font-semibold">429</p>
                    <p className="text-xs text-muted-foreground">
                      Too Many Requests — bitte warten
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bei Überschreitung des Limits antwortet die API mit HTTP{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded border border-border">
                    429
                  </code>
                  . Implementiere exponential backoff in deiner Integration.
                </p>
              </CardContent>
            </Card>

            {/* Endpoints */}
            <SectionHeading id="endpoints">Endpunkte</SectionHeading>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      Methode
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      Pfad
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      Scope
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      Beschreibung
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Parameter
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((ep, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${METHOD_COLORS[ep.method] ?? ""}`}
                        >
                          {ep.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{ep.path}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          {ep.scope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ep.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono hidden md:table-cell">
                        {ep.params}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scopes */}
            <SectionHeading id="scopes">Scopes</SectionHeading>
            <Card>
              <CardContent className="pt-4">
                <div className="grid sm:grid-cols-2 gap-2">
                  {SCOPES.map((scope) => (
                    <div
                      key={scope.id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                    >
                      <code className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                        {scope.id}
                      </code>
                      <span className="text-sm">{scope.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Code examples */}
            <SectionHeading id="examples">Code-Beispiele</SectionHeading>

            <h3 className="text-sm font-semibold mb-2 mt-6">Materialien abrufen (curl)</h3>
            <CodeBlock lang="bash" code={CURL_EXAMPLE} />

            <h3 className="text-sm font-semibold mb-2 mt-6">Materialien abrufen (JavaScript)</h3>
            <CodeBlock lang="javascript" code={JS_EXAMPLE} />

            <h3 className="text-sm font-semibold mb-2 mt-6">Materialien abrufen (Python)</h3>
            <CodeBlock lang="python" code={PYTHON_EXAMPLE} />

            <h3 className="text-sm font-semibold mb-2 mt-6">Werkzeuge suchen (curl)</h3>
            <CodeBlock lang="bash" code={TOOLS_EXAMPLE} />

            {/* Response format */}
            <SectionHeading id="response-format">Antwortformat</SectionHeading>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Listenendpunkte geben immer ein Objekt mit{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded border border-border">
                    data
                  </code>{" "}
                  und{" "}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded border border-border">
                    pagination
                  </code>{" "}
                  zurück.
                </p>
                <CodeBlock
                  lang="JSON"
                  code={`{
  "data": [
    {
      "id": "uuid",
      "name": "Verbandskasten",
      "number": "MAT-001",
      "unit": "Stk",
      "totalStock": 12,
      "reorderLevel": 5,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}`}
                />
              </CardContent>
            </Card>

            {/* Errors */}
            <SectionHeading id="errors">Fehlerbehandlung</SectionHeading>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      HTTP Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      Bedeutung
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                      Massnahme
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { status: "401", meaning: "Ungültiger oder fehlender API-Schlüssel", action: "API-Schlüssel prüfen" },
                    { status: "403", meaning: "Fehlender Scope für diese Ressource", action: "Schlüssel mit korrektem Scope erstellen" },
                    { status: "404", meaning: "Ressource nicht gefunden", action: "ID prüfen" },
                    { status: "429", meaning: "Rate Limit überschritten", action: "Anfragen drosseln, exponential backoff" },
                    { status: "500", meaning: "Interner Serverfehler", action: "Später erneut versuchen" },
                  ].map((row) => (
                    <tr
                      key={row.status}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-semibold">
                        {row.status}
                      </td>
                      <td className="px-4 py-3 text-sm">{row.meaning}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {row.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer CTA */}
            <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
              <p className="font-semibold">Bereit loszulegen?</p>
              <p className="text-sm text-muted-foreground">
                Erstelle deinen ersten API-Schlüssel im Dashboard und starte noch heute
                mit der Integration.
              </p>
              <Link
                href="/dashboard/settings/api-keys"
                className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                API-Schlüssel erstellen
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
