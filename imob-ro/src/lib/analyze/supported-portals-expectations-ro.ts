import { SUPPORTED_LISTING_DOMAINS_RO } from "@/lib/analyze/analyze-failure-reasons";

/** Human-readable list for UI (same order as `SUPPORTED_LISTING_DOMAINS_RO`). */
export function getTopSupportedPortalsLabelRo(): string {
  return SUPPORTED_LISTING_DOMAINS_RO.join(", ");
}

export const ANALYZE_PORTAL_EXPECTATIONS_RO = {
  bestOn: (portals: string) =>
    `Funcționează cel mai bine cu anunțuri de pe ${portals}.`,
  otherLimited: "Pentru alte portaluri, datele pot fi limitate.",
  noPayIfThin: "Dacă raportul nu are suficiente date, nu îți cerem plata.",
} as const;

export function getAnalyzePortalExpectationLinesRo(): string[] {
  const portals = getTopSupportedPortalsLabelRo();
  return [
    ANALYZE_PORTAL_EXPECTATIONS_RO.bestOn(portals),
    ANALYZE_PORTAL_EXPECTATIONS_RO.otherLimited,
    ANALYZE_PORTAL_EXPECTATIONS_RO.noPayIfThin,
  ];
}
