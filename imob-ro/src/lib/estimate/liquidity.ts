/**
 * Liquidity estimation and tighten tips.
 * Recommendations and risks live in their own modules.
 * Pure functions — no DB or side effects.
 */

export { computeRecommendations } from "./recommendations";
export { computeRisks } from "./risks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiquidityResult {
  daysMin?: number;
  daysMax?: number;
  label: "ridicata" | "medie" | "scazuta" | "necunoscuta";
  why?: string;
}

export interface Recommendation {
  title: string;
  impactEurMin: number;
  impactEurMax: number;
  why: string;
}

export interface Risk {
  type: string;
  severity: "low" | "medium" | "high";
  details: string;
}

export interface TightenTip {
  field: string;
  tip: string;
}

export interface PropertyProfile {
  rooms: number;
  usableAreaM2: number;
  condition?: string | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  hasElevator?: boolean | null;
  hasParking?: boolean | null;
  heatingType?: string | null;
  layoutType?: string | null;
  isThermoRehab?: boolean | null;
  lat?: number | null;
  lng?: number | null;
}

// ---------------------------------------------------------------------------
// Liquidity
// ---------------------------------------------------------------------------

export function computeLiquidity(rooms: number, usableAreaM2: number): LiquidityResult {
  if (rooms === 2 && usableAreaM2 >= 40 && usableAreaM2 <= 70)
    return {
      daysMin: 30,
      daysMax: 75,
      label: "ridicata",
      why: "Apartamentele cu 2 camere de 40-70 mp sunt cele mai cautate in Bucuresti",
    };
  if (rooms === 3 && usableAreaM2 >= 60 && usableAreaM2 <= 90)
    return {
      daysMin: 45,
      daysMax: 100,
      label: "medie",
      why: "Apartamentele cu 3 camere au cerere stabila dar audienta mai restransa",
    };
  if (rooms === 1)
    return {
      daysMin: 20,
      daysMax: 60,
      label: "ridicata",
      why: "Garsonierele se vand rapid — cerere mare pentru investitori si tineri",
    };
  if (rooms >= 4)
    return {
      daysMin: 60,
      daysMax: 150,
      label: "scazuta",
      why: "Apartamentele mari au audienta limitata si timp de vanzare mai lung",
    };
  return {
    daysMin: 40,
    daysMax: 110,
    label: "medie",
    why: "Lichiditate medie bazata pe caracteristicile apartamentului",
  };
}

// ---------------------------------------------------------------------------
// Tighten tips
// ---------------------------------------------------------------------------

export function computeTightenTips(input: PropertyProfile, compsUsed: number): TightenTip[] {
  const tips: TightenTip[] = [];

  if (!input.lat || !input.lng)
    tips.push({
      field: "lat/lng",
      tip: "Pune pin pe harta pentru comparabile reale si interval mai strans.",
    });

  if (!input.yearBuilt)
    tips.push({
      field: "yearBuilt",
      tip: "Anul constructiei influenteaza semnificativ estimarea.",
    });

  if (input.floor == null)
    tips.push({ field: "floor", tip: "Etajul modifica pretul cu pana la ±6%." });

  if (input.hasElevator === undefined || input.hasElevator === null)
    tips.push({
      field: "hasElevator",
      tip: "Prezenta liftului conteaza mai ales la etaje inalte.",
    });

  if (!input.heatingType || input.heatingType === "unknown")
    tips.push({ field: "heatingType", tip: "Tipul de incalzire poate varia pretul cu ±3-4%." });

  if (!input.layoutType || input.layoutType === "unknown")
    tips.push({
      field: "layoutType",
      tip: "Compartimentarea (decomandat vs. nedecomandat) conteaza ±2-4%.",
    });

  if (compsUsed < 5 && input.lat && input.lng)
    tips.push({
      field: "zona",
      tip: "Putine comparabile in zona — incearca o locatie intr-o zona mai centrala.",
    });

  return tips;
}
