"use client";

import type { IntelResult } from "@/lib/geo/intelScoring";

interface Props {
  intel: IntelResult | null;
  loading?: boolean;
}

const SCORE_CONFIG: {
  key: keyof IntelResult["scores"];
  icon: string;
  colorBar: string;
  colorText: string;
  colorBg: string;
  description: string;
  invertedRisk?: boolean;
}[] = [
  {
    key: "convenience",
    icon: "🛒",
    colorBar: "bg-emerald-500",
    colorText: "text-emerald-700",
    colorBg: "bg-emerald-50",
    description: "Magazine, farmacii, transport in proximitate",
  },
  {
    key: "family",
    icon: "👨\u200D👩\u200D👧",
    colorBar: "bg-blue-500",
    colorText: "text-blue-700",
    colorBg: "bg-blue-50",
    description: "Scoli, parcuri, zona linistita",
  },
  {
    key: "nightlifeRisk",
    icon: "🌙",
    colorBar: "bg-purple-500",
    colorText: "text-purple-700",
    colorBg: "bg-purple-50",
    description: "Baruri, cluburi, risc de zgomot nocturn",
    invertedRisk: true,
  },
  {
    key: "walkability",
    icon: "🚶",
    colorBar: "bg-amber-500",
    colorText: "text-amber-700",
    colorBg: "bg-amber-50",
    description: "Varietate si densitate POI pe jos",
  },
];

function ScoreBar({ value, colorBar }: { value: number; colorBar: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorBar}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function EvidenceList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5 h-1 w-1 rounded-full bg-gray-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function IntelScoreCards({ intel, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-3 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-2 w-full bg-gray-200 rounded mb-2" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCORE_CONFIG.map((cfg) => {
          const score = intel.scores[cfg.key];
          const evidence = intel.evidence[cfg.key];

          return (
            <div
              key={cfg.key}
              className={`rounded-lg border p-3 ${cfg.colorBg}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <span>{cfg.icon}</span>
                  <span>{score.labelRo}</span>
                </span>
                <span className={`text-sm font-bold ${cfg.colorText}`}>
                  {score.value}
                  <span className="font-normal text-xs text-muted-foreground">/100</span>
                </span>
              </div>

              <ScoreBar value={score.value} colorBar={cfg.colorBar} />

              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{cfg.description}</span>
                <span className={`text-xs font-medium ${cfg.colorText}`}>
                  {cfg.invertedRisk
                    ? score.value >= 60 ? "Ridicat" : score.value >= 30 ? "Moderat" : "Scazut"
                    : score.label}
                </span>
              </div>

              <EvidenceList items={evidence} />
            </div>
          );
        })}
      </div>

      {/* Red flags */}
      {intel.redFlags.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="text-xs font-medium text-red-800 mb-1.5 flex items-center gap-1.5">
            <span>⚠</span> Lipsuri zona
          </div>
          <ul className="space-y-0.5">
            {intel.redFlags.map((flag, i) => (
              <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">-</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
