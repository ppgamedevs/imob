import { logger } from "@/lib/obs/logger";

import type { LlmTextExtraction, LlmVisionExtraction } from "./types";

const CURRENT_YEAR = new Date().getFullYear();

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

interface TextValidationContext {
  totalAreaM2?: number | null;
  rooms?: number | null;
  listingType?: string | null;
}

export function validateTextExtraction(
  data: LlmTextExtraction,
  ctx: TextValidationContext,
): LlmTextExtraction {
  const result = { ...data };
  const failures: string[] = [];

  if (result.fieldConfidence) {
    result.fieldConfidence = {
      condition: clamp01(result.fieldConfidence.condition),
      renovationYear: clamp01(result.fieldConfidence.renovationYear),
      balconyM2: clamp01(result.fieldConfidence.balconyM2),
      heatingType: clamp01(result.fieldConfidence.heatingType),
      usableAreaM2: clamp01(result.fieldConfidence.usableAreaM2),
      sellerMotivation: clamp01(result.fieldConfidence.sellerMotivation),
    };
  }

  if (result.balconyM2 != null) {
    if (result.balconyM2 < 0 || result.balconyM2 > 50) {
      failures.push(`balconyM2=${result.balconyM2} out of range`);
      result.balconyM2 = null;
      result.fieldConfidence.balconyM2 = 0;
    }
    if (ctx.totalAreaM2 && result.balconyM2 != null && result.balconyM2 > ctx.totalAreaM2) {
      failures.push(`balconyM2=${result.balconyM2} > totalArea=${ctx.totalAreaM2}`);
      result.balconyM2 = null;
      result.fieldConfidence.balconyM2 = 0;
    }
  }

  if (result.renovationYear != null) {
    if (result.renovationYear < 1950 || result.renovationYear > CURRENT_YEAR) {
      failures.push(`renovationYear=${result.renovationYear} out of [1950..${CURRENT_YEAR}]`);
      result.renovationYear = null;
      result.fieldConfidence.renovationYear = 0;
    }
  }

  if (result.usableAreaM2 != null) {
    if (result.usableAreaM2 < 5 || result.usableAreaM2 > 1000) {
      failures.push(`usableAreaM2=${result.usableAreaM2} out of range`);
      result.usableAreaM2 = null;
      result.fieldConfidence.usableAreaM2 = 0;
    }
    if (ctx.totalAreaM2 && result.usableAreaM2 != null && result.usableAreaM2 > ctx.totalAreaM2 * 1.1) {
      failures.push(`usableAreaM2=${result.usableAreaM2} > totalArea=${ctx.totalAreaM2}`);
      result.usableAreaM2 = null;
      result.fieldConfidence.usableAreaM2 = 0;
    }
  }

  const isGarsoniera =
    ctx.listingType?.toLowerCase().includes("garsoniera") ||
    ctx.rooms === 1;
  if (isGarsoniera && result.usableAreaM2 != null && result.usableAreaM2 > 60) {
    failures.push(`usableAreaM2=${result.usableAreaM2} too large for garsoniera`);
    result.usableAreaM2 = null;
    result.fieldConfidence.usableAreaM2 = 0;
  }

  if (!Array.isArray(result.redFlags)) result.redFlags = [];
  if (!Array.isArray(result.positives)) result.positives = [];
  if (!Array.isArray(result.evidence)) result.evidence = [];

  // Move "comision 0%" items from redFlags to positives
  const movedToPositive: string[] = [];
  result.redFlags = result.redFlags.filter((flag) => {
    const lower = flag.toLowerCase();
    if (lower.includes("comision 0") || lower.includes("comision zero") || lower.includes("fara comision") || lower.includes("fără comision")) {
      movedToPositive.push(flag.replace(/^!?\s*/, ""));
      return false;
    }
    return true;
  });
  if (movedToPositive.length > 0) {
    result.positives = [...movedToPositive, ...result.positives];
  }

  if (typeof result.summary !== "string") result.summary = "";

  if (failures.length > 0) {
    logger.info({ failures }, "LLM text validation corrections applied");
  }

  return result;
}

export function validateVisionExtraction(
  data: LlmVisionExtraction,
): LlmVisionExtraction {
  const result = { ...data };

  result.confidence = clamp01(result.confidence);

  if (result.brightness < 0 || result.brightness > 3) {
    result.brightness = Math.max(0, Math.min(3, Math.round(result.brightness))) as 0 | 1 | 2 | 3;
  }

  if (!Array.isArray(result.visibleIssues)) result.visibleIssues = [];

  const validConditions = ["nou", "renovat", "locuibil", "necesita_renovare", "de_renovat"];
  if (!validConditions.includes(result.condition)) {
    result.condition = "locuibil";
    result.confidence = 0;
  }

  const validFurnishing = ["gol", "partial_mobilat", "complet_mobilat"];
  if (!validFurnishing.includes(result.furnishing)) {
    result.furnishing = "gol";
  }

  if (typeof result.evidence !== "string") result.evidence = "";

  return result;
}
