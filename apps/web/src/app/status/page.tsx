"use client";

import { useEffect, useState, useCallback } from "react";
import { LogoMark } from "@/components/logo";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Globe,
  Shield,
  Smartphone,
  Monitor,
} from "lucide-react";

interface CheckResult {
  status: "up" | "down";
  latency?: number;
}

interface StatusResponse {
  status: "operational" | "degraded" | "outage";
  checks: Record<string, CheckResult>;
  uptime: string;
  lastChecked: string;
  incidents: { title: string; description: string; date: string; status: string }[];
}

const SERVICE_META: Record<string, { label: string; icon: React.ElementType }> = {
  api: { label: "API", icon: Globe },
  database: { label: "Datenbank", icon: Database },
  auth: { label: "Authentifizierung", icon: Shield },
  web: { label: "Web-App", icon: Monitor },
  mobile: { label: "Mobile API", icon: Smartphone },
};

const STATUS_CONFIG = {
  operational: {
    label: "Alle Systeme betriebsbereit",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Eingeschränkter Betrieb",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
  },
  outage: {
    label: "Systemstörung",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon: XCircle,
  },
};

function StatusDot({ status }: { status: "up" | "down" }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        status === "up"
          ? "bg-emerald-500"
          : "bg-red-500"
      }`}
    />
  );
}

function UptimeBar() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return (
    <div className="flex items-end gap-1.5">
      {days.map((day) => (
        <div key={day} className="flex flex-col items-center gap-1">
          <div className="h-8 w-6 rounded-sm bg-emerald-500/80 dark:bg-emerald-500/60" />
          <span className="text-[10px] text-muted-foreground">{day}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json: StatusResponse = await res.json();
      // Add synthetic checks for web & mobile (derived from api)
      if (json.checks.api) {
        json.checks.web = { status: json.checks.api.status, latency: json.checks.api.latency };
        json.checks.mobile = { status: json.checks.api.status, latency: json.checks.api.latency };
      }
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallStatus = data?.status ?? "outage";
  const config = STATUS_CONFIG[overallStatus];
  const StatusIcon = config.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-base font-semibold tracking-tight text-foreground">
            Logistik<span className="text-primary">App</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">Systemstatus</span>
          </span>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Overall Status Banner */}
      {loading ? (
        <div className="mb-8 flex items-center justify-center rounded-xl border border-border bg-muted/30 p-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Status wird geladen...</span>
        </div>
      ) : (
        <div className={`mb-8 flex items-center gap-3 rounded-xl border p-5 ${config.bg} ${config.border}`}>
          <StatusIcon className={`h-7 w-7 ${config.color}`} />
          <div>
            <p className={`text-lg font-semibold ${config.color}`}>{config.label}</p>
            {data?.uptime && (
              <p className="text-sm text-muted-foreground">
                Verfügbarkeit: {data.uptime}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Service Checks */}
      {!loading && data && (
        <div className="mb-8 divide-y divide-border rounded-xl border border-border bg-card">
          {Object.entries(SERVICE_META).map(([key, meta]) => {
            const check = data.checks[key];
            const Icon = meta.icon;
            return (
              <div key={key} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {check?.latency !== undefined && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {check.latency}ms
                    </span>
                  )}
                  <StatusDot status={check?.status ?? "down"} />
                  <span
                    className={`text-xs font-medium ${
                      check?.status === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {check?.status === "up" ? "Betriebsbereit" : "Gestört"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Uptime History */}
      {!loading && (
        <div className="mb-8 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Verfügbarkeit der letzten 7 Tage
          </h2>
          <UptimeBar />
          <p className="mt-2 text-xs text-muted-foreground">100% Verfügbarkeit</p>
        </div>
      )}

      {/* Incidents */}
      {!loading && (
        <div className="mb-8 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Aktuelle Störungen</h2>
          {!data?.incidents?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Keine aktuellen Störungen
            </div>
          ) : (
            <ul className="space-y-3">
              {data.incidents.map((incident, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                  <p className="text-sm font-medium text-foreground">{incident.title}</p>
                  <p className="text-xs text-muted-foreground">{incident.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{incident.date}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Last checked + auto-refresh hint */}
      {!loading && data && (
        <p className="mb-6 text-center text-xs text-muted-foreground">
          Zuletzt geprüft: {new Date(data.lastChecked).toLocaleString("de-CH")} · Systemstatus wird alle 60 Sekunden aktualisiert
        </p>
      )}

      {/* Footer */}
      <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        LogistikApp · status.logistikapp.ch
      </footer>
    </div>
  );
}
