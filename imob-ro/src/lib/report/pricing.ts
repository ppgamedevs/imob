/**
 * Comps-driven fair price range calculation — report adapter.
 *
 * Delegates to the shared src/lib/estimate/ library and re-exports
 * types that the report page and VerdictSection depend on.
 *
 * BACKWARD COMPAT: report page imports { findComparables, computeFairRange, FairPriceResult }
 */

import { findCompsForReport, type ScoredComp } from "@/lib/estimate/findComparables";
import {
  computeFairRange as _computeFairRange,
  type FairPriceResult,
} from "@/lib/estimate/priceRange";

// Re-export types so existing consumers keep working
export type { ScoredComp as ComparableListing } from "@/lib/estimate/findComparables";
export type { FairPriceResult } from "@/lib/estimate/priceRange";

/**
 * findComparables — wraps findCompsForReport from the shared lib.
 * Signature matches what report/[id]/page.tsx expects.
 */
export async function findComparables(params: {
  analysisId: string;
  lat: number | null;
  lng: number | null;
  areaM2: number;
  rooms: number | null;
  yearBuilt: number | null;
}): Promise<ScoredComp[]> {
  return findCompsForReport(params);
}

/**
 * computeFairRange — wraps the shared lib version.
 * Signature matches what report/[id]/page.tsx expects.
 */
export function computeFairRange(comps: ScoredComp[], subjectAreaM2: number): FairPriceResult {
  return _computeFairRange(comps, subjectAreaM2);
}
