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

type GapSeverity = "redus" | "mediu" | "ridicat";

function zoneGapSeverity(familyScore: number, flagCount: number): GapSeverity {
  if (flagCount >= 4 || familyScore < 35) return "ridicat";
  if (flagCount >= 2 || familyScore < 55) return "mediu";
  return "redus";
}

function zoneGapSummaryLine(flags: string[]): string {
  const blob = flags.join(" ").toLowerCase();
  if (/scoal|gradinit|copil|famili/i.test(blob)) {
    return "Impact: poate conta pentru familii cu copii sau rutina zilnica.";
  }
  if (/transport|metrou|statie|parcare/i.test(blob)) {
    return "Impact: relevant pentru mobilitate si timp in trafic.";
  }
  if (/parc|verde|linist/i.test(blob)) {
    return "Impact: confort locuire si agrement in zona.";
  }
  return "Context despre ce lipseste in proximitate — nu inseamna automat „zona rea”.";
}

const SEVERITY_BADGE: Record<
  GapSeverity,
  { label: string; className: string }
> = {
  redus: {
    label: "Impact redus",
    className: "bg-slate-100 text-slate-700 ring-slate-200/80",
  },
  mediu: {
    label: "Impact mediu",
    className: "bg-sky-50 text-sky-900 ring-sky-200/70",
  },
  ridicat: {
    label: "Impact ridicat",
    className: "bg-amber-50 text-amber-950 ring-amber-200/80",
  },
};

function ZoneGapsPanel({
  redFlags,
  familyScore,
}: {
  redFlags: string[];
  familyScore: number;
}) {
  const severity = zoneGapSeverity(familyScore, redFlags.length);
  const badge = SEVERITY_BADGE[severity];
  const summary = zoneGapSummaryLine(redFlags);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-800">Lipsuri zona</h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-snug text-slate-600">{summary}</p>
      <ul className="mt-3 space-y-1.5">
        {redFlags.map((flag, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px] leading-snug text-slate-700"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
            <span>{flag}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-slate-700">
        <span className="font-semibold">Pas urmator: </span>
        Plimba-te 10–15 min in jur ca sa simti lipsurile in viata reala (nu doar pe harta).
      </p>
    </div>
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
              className={`rounded-lg p-3 ring-1 ring-black/5 ${cfg.colorBg}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <span>{cfg.icon}</span>
                  <span>{score.labelRo}</span>
                </span>
                <span className={`text-sm font-bold ${cfg.colorText} inline-flex items-baseline gap-1`}>
                  {score.value}
                  <span className="font-normal text-xs text-muted-foreground">/100</span>
                  <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                    ~ estimat
                  </span>
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

      {/* Zone gaps — informative, not error-state */}
      {intel.redFlags.length > 0 && (
        <ZoneGapsPanel redFlags={intel.redFlags} familyScore={intel.scores.family.value} />
      )}
    </div>
  );
}
