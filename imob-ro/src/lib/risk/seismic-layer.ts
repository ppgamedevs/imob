import type { RiskLayerResult, RiskLevel } from "./types";

function mapSeismicRiskToLevel(riskClass: string | null): RiskLevel {
  if (!riskClass) return "unknown";
  const normalized = riskClass.toUpperCase();
  if (normalized === "RSI" || normalized === "RS1" || normalized === "RSII" || normalized === "RS2") {
    return "high";
  }
  if (normalized === "RSIII" || normalized === "RS3") return "medium";
  if (normalized === "RSIV" || normalized === "RS4" || normalized === "NONE") return "low";
  return "unknown";
}

function mapSeismicRiskToScore(riskClass: string | null): number | null {
  if (!riskClass) return null;
  const normalized = riskClass.toUpperCase();
  if (normalized === "RSI" || normalized === "RS1") return 95;
  if (normalized === "RSII" || normalized === "RS2") return 80;
  if (normalized === "RSIII" || normalized === "RS3") return 55;
  if (normalized === "RSIV" || normalized === "RS4") return 25;
  if (normalized === "NONE") return 10;
  return null;
}

function buildSeismicSummary(riskClass: string | null, note: string | null): string {
  if (!riskClass) {
    return "Date seismice indisponibile momentan pentru aceasta proprietate.";
  }

  switch (riskClass.toUpperCase()) {
    case "RSI":
    case "RS1":
      return "Cladirea este incadrata in risc seismic major conform datelor existente.";
    case "RSII":
    case "RS2":
      return "Cladirea apare cu risc seismic semnificativ si necesita verificare atenta.";
    case "RSIII":
    case "RS3":
      return "Exista semnale de risc seismic moderat pentru acest imobil.";
    case "RSIV":
    case "RS4":
      return "Cladirea are susceptibilitate seismica redusa conform datelor gasite.";
    case "NONE":
      return note
        ? `Nu apare in lista publica AMCCRS. ${note}`
        : "Cladirea nu a fost identificata in lista publica AMCCRS.";
    default:
      return note ?? "Datele seismice necesita verificare manuala suplimentara.";
  }
}

export function buildSeismicRiskLayerFromExplain(
  seismicExplain: Record<string, unknown> | null,
  updatedAt: string | Date | null,
): RiskLayerResult {
  const riskClass =
    typeof seismicExplain?.riskClass === "string" ? seismicExplain.riskClass : null;
  const confidence =
    typeof seismicExplain?.confidence === "number" ? seismicExplain.confidence : null;
  const note = typeof seismicExplain?.note === "string" ? seismicExplain.note : null;
  const matchedAddress =
    typeof seismicExplain?.matchedAddress === "string" ? seismicExplain.matchedAddress : null;
  const intervention =
    typeof seismicExplain?.intervention === "string" ? seismicExplain.intervention : null;
  const sourceName = typeof seismicExplain?.source === "string" ? seismicExplain.source : "AMCCRS";
  const sourceUrl =
    typeof seismicExplain?.sourceUrl === "string" ? seismicExplain.sourceUrl : null;
  const nearby =
    seismicExplain?.nearby && typeof seismicExplain.nearby === "object" && !Array.isArray(seismicExplain.nearby)
      ? (seismicExplain.nearby as Record<string, unknown>)
      : null;
  const nearbyTotal = typeof nearby?.total === "number" ? nearby.total : null;
  const nearbyRsI = typeof nearby?.rsI === "number" ? nearby.rsI : null;
  const nearbyRsII = typeof nearby?.rsII === "number" ? nearby.rsII : null;

  const details = [
    matchedAddress ? `Adresa potrivita: ${matchedAddress}.` : null,
    intervention ? `Status interventie: ${intervention}.` : null,
    note ? `Nota metoda: ${note}` : null,
    nearbyTotal != null
      ? `Cladiri cu risc in 200m: ${nearbyTotal}${nearbyRsI != null ? `, din care RsI ${nearbyRsI}` : ""}${nearbyRsII != null ? ` si RsII ${nearbyRsII}` : ""}.`
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    key: "seismic",
    level: mapSeismicRiskToLevel(riskClass),
    score: mapSeismicRiskToScore(riskClass),
    confidence,
    summary: buildSeismicSummary(riskClass, note),
    details,
    sourceName,
    sourceUrl,
    updatedAt:
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : typeof updatedAt === "string"
          ? updatedAt
          : null,
  };
}
