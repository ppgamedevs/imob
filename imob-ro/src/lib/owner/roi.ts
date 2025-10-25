/**
 * ROI Quick Fixes Engine
 * Suggests high-impact, low-cost improvements for owners
 */

import type { OwnerRoiItem } from "@/types/owner";

type QualityExplain = {
  photos?: { count: number; score: number };
  text?: { length: number; score: number };
  completeness?: { missing: string[]; score: number };
};

type Features = {
  areaM2?: number;
  yearBuilt?: number;
  condition?: string;
  [key: string]: any;
};

/**
 * Build ROI suggestions based on quality signals and listing features
 */
export function buildRoiSuggestions(
  features: Features,
  explainQuality?: QualityExplain,
): OwnerRoiItem[] {
  const items: OwnerRoiItem[] = [];

  // 1. Professional Photos (most impactful)
  const photoCount = explainQuality?.photos?.count ?? 0;
  if (photoCount < 6) {
    items.push({
      id: "photo_profi",
      label: "Foto profesionale",
      cost: [250, 400],
      impact: {
        type: "tts",
        pct: photoCount < 3 ? 20 : 12, // bigger impact if very few photos
      },
      note: "Fotografiile profesionale cresc click-through-ul cu 40-70% și reduc timpul de vânzare cu 10-20 zile.",
    });
  }

  // 2. Fresh Paint (white/neutral)
  const condition = features.condition?.toLowerCase() ?? "";
  const yearBuilt = features.yearBuilt ?? 2000;
  const needsPaint = condition.includes("dated") || condition.includes("old") || yearBuilt < 2000;

  if (needsPaint) {
    items.push({
      id: "paint_white",
      label: "Zugrăvit alb (pereți)",
      cost: [1500, 2500],
      impact: {
        type: "avm",
        pct: 2.5,
      },
      note: "Pereții proaspăt zugrăviți în alb neutru fac spațiul să pară mai mare și mai modern. Lift AVM estimat: 1-3%.",
    });
  }

  // 3. Light Staging
  const textLength = explainQuality?.text?.length ?? 0;
  const needsStaging = photoCount < 8 || textLength < 150;

  if (needsStaging) {
    items.push({
      id: "staging_light",
      label: "Staging ușor (decoruri, lumini)",
      cost: [800, 1500],
      impact: {
        type: "avm",
        pct: 1.5,
      },
      note: "Perne decorative, lumini ambientale și plante verzi adaugă 1-2% la valoarea percepută. TTS -10%.",
    });
  }

  // 4. Extended Description
  if (textLength < 220) {
    items.push({
      id: "extend_description",
      label: "Extinde descrierea",
      cost: [0, 50],
      impact: {
        type: "tts",
        pct: 5,
      },
      note: "O descriere completă (>250 caractere) cu detalii despre cartier, facilități și finisaje atrage cumpărători serioși.",
    });
  }

  // 5. Fix Minor Issues (faucets, tiles, corners)
  const missingFields = explainQuality?.completeness?.missing ?? [];
  const needsMinorFixes = missingFields.length > 2 || condition.includes("fair");

  if (needsMinorFixes) {
    items.push({
      id: "minor_repairs",
      label: "Repară robineți/colțare",
      cost: [200, 400],
      impact: {
        type: "avm",
        pct: 0.5,
      },
      note: "Robineți noi și colțare reparate elimină semnale de neglijență. Calitate +1 nivel.",
    });
  }

  // 6. Deep Clean + Declutter
  if (photoCount > 0 && photoCount < 10) {
    items.push({
      id: "deep_clean",
      label: "Curățenie profundă + declutter",
      cost: [150, 300],
      impact: {
        type: "tts",
        pct: 8,
      },
      note: "Un spațiu curat și minimalist face o impresie excelentă la vizionare. TTS -5-10 zile.",
    });
  }

  return items;
}

/**
 * Calculate payback period for an ROI item given estimated rent
 */
export function calculatePayback(
  item: OwnerRoiItem,
  avmMid: number,
  rentEur?: number,
): number | null {
  const avgCost = (item.cost[0] + item.cost[1]) / 2;

  if (item.impact.type === "avm") {
    // Capital gain approach: lift in AVM / avg cost
    const lift = avmMid * (item.impact.pct / 100);
    return avgCost / lift; // years to recoup via appreciation
  }

  if (item.impact.type === "tts" && rentEur) {
    // Rental income approach: cost / monthly rent
    return avgCost / rentEur; // months to recoup via rent
  }

  return null;
}
