/**
 * US AQI-style buckets → Romanian labels + calm UI tokens (not traffic-light harsh).
 */

export type AqiTone = "good" | "acceptable" | "moderate" | "poor" | "hazardous";

export interface AqiLabelResult {
  label: string;
  tone: AqiTone;
  /** Tailwind-friendly semantic classes for text + soft background */
  chipClass: string;
  numberClass: string;
}

/** 200+ → Periculos (product spec) */
export function mapAqiToLabel(aqi: number): AqiLabelResult {
  const n = Math.max(0, Math.round(aqi));
  if (n <= 50) {
    return {
      label: "Bun",
      tone: "good",
      chipClass: "border-emerald-200/80 bg-emerald-50/90 text-emerald-950",
      numberClass: "text-emerald-900",
    };
  }
  if (n <= 100) {
    return {
      label: "Acceptabil",
      tone: "acceptable",
      chipClass: "border-lime-200/80 bg-lime-50/90 text-lime-950",
      numberClass: "text-lime-950",
    };
  }
  if (n <= 150) {
    return {
      label: "Moderat",
      tone: "moderate",
      chipClass: "border-amber-200/80 bg-amber-50/90 text-amber-950",
      numberClass: "text-amber-950",
    };
  }
  if (n <= 200) {
    return {
      label: "Slab",
      tone: "poor",
      chipClass: "border-orange-200/80 bg-orange-50/90 text-orange-950",
      numberClass: "text-orange-950",
    };
  }
  return {
    label: "Periculos",
    tone: "hazardous",
    chipClass: "border-rose-200/80 bg-rose-50/90 text-rose-950",
    numberClass: "text-rose-950",
  };
}

/** One-line for “Ce înseamnă pentru tine” */
export function aqiMeaningForBuyer(label: AqiLabelResult["tone"]): string {
  switch (label) {
    case "good":
      return "Calitatea aerului este bună în acest moment pentru activități obișnuite în exterior.";
    case "acceptable":
      return "Calitatea aerului este acceptabilă; persoanele sensibile pot simți disconfort la efort prelungit.";
    case "moderate":
      return "Calitatea moderată: sensibilii ar putea reduce expunerea prelungită în aer liber.";
    case "poor":
      return "Calitate slabă: merită limitat timpul în exterior, mai ales pentru copii și sensibili.";
    case "hazardous":
      return "Nivel ridicat: evitați expunerea prelungită în exterior dacă este posibil.";
    default:
      return "";
  }
}
