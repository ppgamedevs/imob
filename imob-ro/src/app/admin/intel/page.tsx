"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface JobStatus {
  name: string;
  lastRun: string | null;
  lastDuration: number | null;
}

interface JobConfig {
  action: string;
  label: string;
  description: string;
  icon: string;
  flag: string;
}

const JOBS: JobConfig[] = [
  {
    action: "seismic-import",
    label: "Import seismic AMCCRS",
    description: "Descarca si importa lista de cladiri cu risc seismic din Bucuresti.",
    icon: "🏚️",
    flag: "SEISMIC_ENABLED",
  },
  {
    action: "poi-import",
    label: "Import POI din OSM",
    description: "Importa puncte de interes (baruri, parcuri, scoli etc.) din OpenStreetMap.",
    icon: "📍",
    flag: "POI_ENABLED",
  },
  {
    action: "gtfs-import",
    label: "Import transport GTFS",
    description: "Importa statii de transport public din fisierul GTFS.",
    icon: "🚇",
    flag: "TRANSPORT_ENABLED",
  },
  {
    action: "dedup-recompute",
    label: "Recalculeaza duplicate",
    description: "Scaneaza anunturile si detecteaza duplicate pe baza de text, imagini si adresa.",
    icon: "🔄",
    flag: "INTEGRITY_ENABLED",
  },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}min`;
}

function JobCard({
  config,
  status,
  onRun,
}: {
  config: JobConfig;
  status: JobStatus | null;
  onRun: (action: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; durationMs?: number } | null>(null);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: config.action }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, durationMs: data.durationMs });
      } else {
        setResult({ ok: false, message: data.error || data.message || "Unknown error" });
      }
      onRun(config.action);
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setRunning(false);
    }
  }, [config.action, onRun]);

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{config.label}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-500">
              {config.flag}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>

          {/* Last run info */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            {status?.lastRun ? (
              <>
                <span>Ultima rulare: <strong className="text-gray-700">{fmtDate(status.lastRun)}</strong></span>
                {status.lastDuration != null && (
                  <span>Durata: <strong className="text-gray-700">{fmtDuration(status.lastDuration)}</strong></span>
                )}
              </>
            ) : (
              <span className="italic">Niciodata rulat</span>
            )}
          </div>

          {/* Result feedback */}
          {result && (
            <div className={`mt-2 rounded-lg px-3 py-1.5 text-xs ${
              result.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}>
              {result.ok
                ? `Terminat cu succes${result.durationMs ? ` in ${fmtDuration(result.durationMs)}` : ""}`
                : `Eroare: ${result.message}`}
            </div>
          )}
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Ruleaza...
            </span>
          ) : (
            "Ruleaza"
          )}
        </button>
      </div>
    </div>
  );
}

export default function AdminIntelPage() {
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/intel");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.jobs ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const getStatus = (action: string) =>
    statuses.find((s) => s.name === action) ?? null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Intel Data Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Import si gestionare date geo (seismic, POI, transport) si integritate.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Admin
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {JOBS.map((job) => (
            <JobCard
              key={job.action}
              config={job}
              status={getStatus(job.action)}
              onRun={() => {
                setTimeout(loadStatuses, 1000);
              }}
            />
          ))}
        </div>
      )}

      {/* Feature flags status */}
      <div className="mt-8 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-sm mb-3">Feature Flags</h2>
        <p className="text-xs text-gray-500 mb-3">
          Setate in <code className="bg-gray-100 px-1 rounded">.env.local</code>. Reporniti serverul dupa modificari.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            "SEISMIC_ENABLED",
            "POI_ENABLED",
            "TRANSPORT_ENABLED",
            "PRICING_V2_ENABLED",
            "INTEGRITY_ENABLED",
            "PDF_ENABLED",
          ].map((flag) => (
            <div
              key={flag}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <span className={`h-2 w-2 rounded-full ${
                typeof window === "undefined" ? "bg-gray-300" : "bg-gray-300"
              }`} />
              <span className="font-mono text-gray-600">{flag}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-gray-400">
          Statusul flag-urilor se verifica server-side. Valorile nu sunt expuse in browser.
        </p>
      </div>
    </div>
  );
}
