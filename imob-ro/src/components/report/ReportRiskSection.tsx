import type { AirQualityReading } from "@/lib/risk/aqicn";
import type { BuyerSeismicView } from "@/lib/risk/seismic-label";

import RiskAirQualityCard from "./RiskAirQualityCard";
import RiskSeismicCard from "./RiskSeismicCard";

function formatSeismicClass(rc: string): string {
  const u = rc.toUpperCase();
  if (u === "RSI" || u === "RS1") return "Rs I";
  if (u === "RSII" || u === "RS2") return "Rs II";
  if (u === "RSIII" || u === "RS3") return "Rs III";
  if (u === "RSIV" || u === "RS4") return "Rs IV";
  return rc;
}

function trafficFromZone(zoneKey: string | null | undefined): string {
  if (!zoneKey) return "Necunoscut";
  if (zoneKey === "nightlife" || zoneKey === "mixed") return "Mediu";
  if (zoneKey === "residential" || zoneKey === "green") return "Scăzut";
  if (zoneKey === "limited") return "Ridicat";
  return "Mediu";
}

function buildSeismicSummary(view: BuyerSeismicView, riskClass: string | null): string {
  const rc = riskClass?.trim() || null;
  const rcu = rc?.toUpperCase() ?? "";
  const hasClass = rc && rcu !== "NONE" && !rcu.includes("UNKNOWN");

  if (view.state === "official_list") {
    return hasClass ? `${formatSeismicClass(rc!)} (oficial)` : "Clasificare oficială";
  }
  if (view.state === "not_on_public_list") {
    return hasClass ? `${formatSeismicClass(rc!)} · verificare limitată` : "Nu în listă publică";
  }
  if (hasClass) return `${formatSeismicClass(rc!)} (estimare)`;
  return "Necunoscut";
}

function buildAirSummary(reading: AirQualityReading | null): string {
  if (!reading) return "Indisponibil";
  return `${reading.aqi} (${reading.label})`;
}

export default function ReportRiskSection({
  airQuality,
  seismic,
  vibeZoneTypeKey,
  seismicRiskClass,
}: {
  airQuality: AirQualityReading | null;
  seismic: BuyerSeismicView;
  /** Vibe `zoneTypeKey` — proxy for street activity / congestion. */
  vibeZoneTypeKey?: string | null;
  /** Pipeline / match seismic class when available. */
  seismicRiskClass?: string | null;
}) {
  const airLine = buildAirSummary(airQuality);
  const seismicLine = buildSeismicSummary(seismic, seismicRiskClass ?? null);
  const trafficLine = trafficFromZone(vibeZoneTypeKey);

  return (
    <section className="space-y-4" aria-labelledby="report-risk-heading">
      <div>
        <h2
          id="report-risk-heading"
          className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl"
        >
          Risc & mediu
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Rezumat rapid — detaliile complete sunt extensibile mai jos.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base" aria-hidden>
            🌫
          </span>
          <span className="font-semibold text-slate-700 shrink-0">Aer:</span>
          <span className="tabular-nums">{airLine}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base" aria-hidden>
            🏗
          </span>
          <span className="font-semibold text-slate-700 shrink-0">Seismic:</span>
          <span>{seismicLine}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base" aria-hidden>
            🚗
          </span>
          <span className="font-semibold text-slate-700 shrink-0">Trafic (zonă):</span>
          <span>{trafficLine}</span>
        </div>
      </div>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
          <span>Detalii risc (aer, seismic)</span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-slate-100 px-4 py-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <RiskAirQualityCard reading={airQuality} />
            <RiskSeismicCard view={seismic} />
          </div>
        </div>
      </details>
    </section>
  );
}
