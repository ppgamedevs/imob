/**
 * Copy + numeric helpers for the buyer report "comparabile" section.
 * Wording: listări (anunțuri), not tranzacții, unless you add real transaction data elsewhere.
 */

import {
  COMPS_AREA_RANGE_HIGH,
  COMPS_AREA_RANGE_LOW,
  COMPS_MAX_AGE_DAYS,
  COMPS_MAX_DISTANCE_M,
} from "@/lib/constants";
import { median } from "@/lib/math";

export function medianEurM2FromCompRows(
  eurM2s: (number | null | undefined)[],
): number | null {
  const v = eurM2s.filter((x): x is number => x != null && x > 0 && Number.isFinite(x));
  if (!v.length) return null;
  const m = median(v);
  return m == null ? null : Math.round(m);
}

export function subjectAskingEurM2(askingEur: number | null, areaM2: number | null): number | null {
  if (askingEur == null || areaM2 == null || areaM2 <= 0) return null;
  return askingEur / areaM2;
}

/** Percent difference: (asking - median) / median * 100 */
export function pctAskingEurM2VsMedian(askingEurM2: number, medianEurM2: number): number {
  if (medianEurM2 <= 0) return 0;
  return Math.round(((askingEurM2 - medianEurM2) / medianEurM2) * 100);
}

export function averageCompDistanceM(
  distanceMs: (number | null | undefined)[],
): number | null {
  const v = distanceMs.filter((d): d is number => d != null && d >= 0 && Number.isFinite(d));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function buildComparabilityCriteriaLinesRo(input: {
  hasSubjectCoords: boolean;
  subjectRooms: number | null;
  areaSlug: string | null;
  city: string | null;
  averageDistanceM: number | null;
}): string[] {
  const km = (COMPS_MAX_DISTANCE_M / 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 });
  const lo = Math.round(COMPS_AREA_RANGE_LOW * 100);
  const hi = Math.round(COMPS_AREA_RANGE_HIGH * 100);
  const months = Math.max(1, Math.round(COMPS_MAX_AGE_DAYS / 30));

  const lines: string[] = [];
  lines.push(
    `Distanță: căutăm anunțuri comparabile până la aprox. ${km} km față de reperul tău (când avem coordonate).`,
  );
  if (input.subjectRooms != null) {
    lines.push(
      "Camere: includem anunțuri cu același număr de camere sau diferență de maximum o cameră, ca profil apropiat.",
    );
  } else {
    lines.push("Camere: când numărul de camere e clar, îl folosim la potrivire; altfel criteriul e relaxat.");
  }
  lines.push(
    `Suprafață: păstrăm anunțuri cu suprafață apropiată (orientativ ${lo}–${hi}% față de imobilul tău).`,
  );
  lines.push(
    `Actualitate: anunțuri indexate în fereastra recentă (până la ~${months} luni) — prețuri cerute public, nu baza de tranzacții oficiale.`,
  );
  if (input.areaSlug) {
    lines.push(
      `Zonă ImobIntel: reținem anunțuri aliniate zonei “${input.areaSlug}” când e disponibilă în date.`,
    );
  } else if (input.city) {
    lines.push(
      `Așezare: preferință pentru aceeași localitate când o avem clar în date (${input.city}).`,
    );
  } else {
    lines.push("Așezare: aliniem după proximitate și metadate disponibile, când e posibil.");
  }
  if (input.hasSubjectCoords && input.averageDistanceM != null) {
    lines.push(
      `Distanță medie la setul afișat: ~${Math.round(input.averageDistanceM).toLocaleString("ro-RO")} m (față de punctul tău).`,
    );
  }
  return lines;
}

export function roHeadlineCompsFound(n: number): string {
  if (n <= 0) return "";
  if (n === 1) return "Am găsit 1 anunț comparabil în apropiere, după criteriile de mai jos.";
  return `Am găsit ${n} anunțuri comparabile în apropiere, după criteriile de mai jos.`;
}

export function roPriceM2VsCompMedian(pct: number | null | undefined, hasData: boolean): string | null {
  if (!hasData) return null;
  if (pct == null || !Number.isFinite(pct)) return "Nu putem calcula o diferență clară preț/m²: lipsește prețul sau suprafața din fișă.";
  if (Math.abs(pct) < 2) {
    return "Prețul pe m² e foarte aproape de mediana anunțurilor comparabile (diferență sub ~2%).";
  }
  if (pct > 0) {
    return `Prețul pe m² este cu aproximativ ${Math.abs(pct)}% peste mediana anunțurilor comparabile.`;
  }
  return `Prețul pe m² este cu aproximativ ${Math.abs(pct)}% sub mediana anunțurilor comparabile.`;
}

export function roWeakCompsWarning(compsCount: number, confidenceIsLow: boolean): string | null {
  if (compsCount === 0) return null;
  if (compsCount < 3 || confidenceIsLow) {
    return "Comparabilele sunt limitate, deci estimarea are încredere redusă. Folosește cifrele ca reper, nu ca verdict de piață.";
  }
  return null;
}

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
