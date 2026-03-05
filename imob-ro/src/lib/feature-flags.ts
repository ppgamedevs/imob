/**
 * Centralised feature-flag helpers.
 *
 * Every heavy / optional feature is gated behind an env var.
 * Flags default to OFF so a fresh VPS deploy is safe.
 */

function isOn(envVar: string | undefined): boolean {
  if (!envVar) return false;
  return envVar === "true" || envVar === "1";
}

export const flags = {
  get seismic() {
    return isOn(process.env.SEISMIC_ENABLED);
  },
  get poi() {
    return isOn(process.env.POI_ENABLED);
  },
  get transport() {
    return isOn(process.env.TRANSPORT_ENABLED);
  },
  get pricingV2() {
    return isOn(process.env.PRICING_V2_ENABLED);
  },
  get integrity() {
    return isOn(process.env.INTEGRITY_ENABLED);
  },
  get pdf() {
    return isOn(process.env.PDF_ENABLED);
  },
  get estimatePaywall() {
    return isOn(process.env.ESTIMATE_PAYWALL);
  },
  get estimateEnabled() {
    return isOn(process.env.ESTIMATE_ENABLED);
  },
  get estimatePersist() {
    return isOn(process.env.ESTIMATE_PERSIST);
  },
  get geoIntel() {
    return isOn(process.env.GEO_INTEL_ENABLED);
  },
} as const;

export type FlagKey = keyof typeof flags;

export function isFeatureEnabled(key: FlagKey): boolean {
  return flags[key];
}
