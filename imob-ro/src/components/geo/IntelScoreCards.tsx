"use client";

import type { IntelResult, ZoneDataQualityLevel } from "@/lib/geo/intelScoring";
import { POI_CATEGORY_KEYS, type PoiCategoryKey } from "@/lib/geo/poiCategories";
import type { PoiIngestionMeta } from "@/lib/geo/poiIngestion";

interface Props {
  intel: IntelResult | null;
  loading?: boolean;
  /** Server POI pipeline meta (OSM / Google / notices). */
  poiIngestion?: PoiIngestionMeta | null;
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

const QUALITY_LABEL_RO: Record<ZoneDataQualityLevel, string> = {
  scazuta: "Scazuta",
  medie: "Medie",
  ridicata: "Ridicata",
};

const QUALITY_BADGE: Record<
  ZoneDataQualityLevel,
  { className: string }
> = {
  scazuta: {
    className: "bg-sky-50 text-sky-900 ring-sky-200/70",
  },
  medie: {
    className: "bg-sky-50/80 text-sky-950 ring-sky-200/60",
  },
  ridicata: {
    className: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
  },
};

const FACILITY_ROWS: { key: PoiCategoryKey; label: string }[] = [
  { key: "supermarket", label: "Magazine / proximitate" },
  { key: "transport", label: "Transport" },
  { key: "school", label: "Scoli / gradinite" },
  { key: "park", label: "Parcuri / verde" },
  { key: "medical", label: "Medical" },
];

function ScoreBar({ value, colorBar }: { value: number; colorBar: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100/90 overflow-hidden">
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
        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
          <span className="shrink-0 mt-0.5 h-1 w-1 rounded-full bg-slate-400" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function strongCoverageMode(q: IntelResult["zoneDataQuality"]): boolean {
  if (q.lowDataMode) return false;
  return q.level === "ridicata" || (q.level === "medie" && q.totalPois >= 26);
}

function buildPositiveInsights(intel: IntelResult): string[] {
  const c = intel.categoryCounts;
  const out: string[] = [];
  if ((c.transport ?? 0) >= 3) {
    out.push("Transport public bine reprezentat in datele OSM pentru raza selectata.");
  }
  if ((c.supermarket ?? 0) >= 2) {
    out.push("Mai multe puncte de cumparaturi cartate in apropiere.");
  }
  if ((c.park ?? 0) >= 1 && intel.scores.family.value >= 50) {
    out.push("Spatii verzi cartate in zona.");
  }
  return out.slice(0, 2);
}

/** Low OSM coverage — short signal, no false precision. */
function LowDataZonePanel() {
  return (
    <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-950">
        <span className="mr-1.5" aria-hidden>
          ⚠
        </span>
        Date parțiale pentru zonă — scorurile sunt orientative, nu un catalog complet de POI.
      </p>
    </div>
  );
}

function FacilitiesIdentifiedPanel({ intel }: { intel: IntelResult }) {
  const insights = buildPositiveInsights(intel);
  const rowsWithData = FACILITY_ROWS.filter((row) => (intel.categoryCounts[row.key] ?? 0) > 0);
  return (
    <div className="mt-5 space-y-3 rounded-xl bg-emerald-50/35 px-4 py-4">
      <h3 className="text-sm font-semibold text-slate-900">Facilități confirmate în date (OSM)</h3>
      <p className="text-xs text-slate-600">
        Afișăm doar categorii cu cel puțin un punct cartat — nu listăm „0” ca verdict negativ.
      </p>
      {rowsWithData.length === 0 ? (
        <p className="text-sm text-slate-700">
          <span className="mr-1" aria-hidden>
            ⚠
          </span>
          Date parțiale pentru zonă — niciun POI confirmat în rază pentru categoriile urmărite.
        </p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-800">
          {rowsWithData.map(({ key, label }) => (
            <li
              key={key}
              className="flex justify-between gap-4 border-b border-emerald-100/80 pb-2 last:border-0 last:pb-0"
            >
              <span className="text-slate-600">{label}</span>
              <span className="font-semibold tabular-nums">{intel.categoryCounts[key]}</span>
            </li>
          ))}
        </ul>
      )}
      {insights.length > 0 && (
        <ul className="pt-1 space-y-1 text-sm text-slate-700">
          {insights.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-emerald-600 shrink-0">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PartialDataNote() {
  return (
    <p className="mt-5 text-sm font-medium text-slate-700">
      <span className="mr-1" aria-hidden>
        ⚠
      </span>
      Date parțiale pentru zonă — scoruri orientative.
    </p>
  );
}

export default function IntelScoreCards({ intel, loading, poiIngestion }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg p-3 animate-pulse bg-slate-50/80">
            <div className="h-4 w-24 bg-slate-200/80 rounded mb-2" />
            <div className="h-2 w-full bg-slate-200/80 rounded mb-2" />
            <div className="h-3 w-16 bg-slate-200/80 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!intel) return null;

  const q = intel.zoneDataQuality;
  const qualityBadge = QUALITY_BADGE[q.level];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-slate-900">Calitatea datelor despre zona</h3>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${qualityBadge.className}`}
          >
            Calitate date zona: {QUALITY_LABEL_RO[q.level]}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {q.totalPois === 0 ? (
            "Date limitate, estimare bazata pe surse disponibile."
          ) : (
            <>
              {q.totalPois} puncte · {q.categoriesWithData} categorii cu date (din{" "}
              {POI_CATEGORY_KEYS.length})
              {poiIngestion?.usedGoogleFallback
                ? " · surse: OpenStreetMap + Google Places"
                : " · sursa: OpenStreetMap"}
            </>
          )}
        </p>
        {poiIngestion?.notice && (
          <p className="text-xs text-slate-600 mt-1.5 leading-snug">{poiIngestion.notice}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCORE_CONFIG.map((cfg) => {
          const score = intel.scores[cfg.key];
          const evidence = intel.evidence[cfg.key];
          const uncertain =
            cfg.key === "nightlifeRisk"
              ? intel.uncertainScores.nightlifeRisk
              : intel.uncertainScores[cfg.key as "convenience" | "family" | "walkability"];

          return (
            <div key={cfg.key} className={`rounded-xl px-3 py-3 ${cfg.colorBg} shadow-none`}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-sm font-medium flex items-center gap-1.5 min-w-0">
                  <span>{cfg.icon}</span>
                  <span className="truncate">{score.labelRo}</span>
                </span>
                <span className={`text-sm font-bold ${cfg.colorText} inline-flex flex-col items-end shrink-0`}>
                  <span className="inline-flex items-baseline gap-1">
                    {score.value}
                    <span className="font-normal text-xs text-slate-500">/100</span>
                  </span>
                  {uncertain ? (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-sky-700">
                      Estimare incerta
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      ~ estimat
                    </span>
                  )}
                </span>
              </div>

              <ScoreBar value={score.value} colorBar={cfg.colorBar} />

              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-600 leading-snug">{cfg.description}</span>
                <span className={`text-xs font-medium shrink-0 ${cfg.colorText}`}>
                  {cfg.invertedRisk
                    ? score.value >= 60
                      ? "Ridicat"
                      : score.value >= 30
                        ? "Moderat"
                        : "Scazut"
                    : score.label}
                </span>
              </div>

              <EvidenceList items={evidence} />
            </div>
          );
        })}
      </div>

      {q.lowDataMode ? (
        <LowDataZonePanel />
      ) : strongCoverageMode(q) ? (
        <FacilitiesIdentifiedPanel intel={intel} />
      ) : (
        <PartialDataNote />
      )}
    </div>
  );
}
