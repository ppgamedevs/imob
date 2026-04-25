/**
 * Feature flags system
 *
 * MVP flags default to OFF. Enable via env vars when ready.
 * Core path (Landing -> Analyze -> Report -> Paywall -> Subscribe) is always ON.
 */

export const flags = {
  // UI chrome
  demo: process.env.NEXT_PUBLIC_DEMO === "1",
  tour: process.env.NEXT_PUBLIC_TOUR === "1",
  ads: process.env.NEXT_PUBLIC_ADS !== "0",
  devProjects: process.env.NEXT_PUBLIC_DEV_PROJECTS === "1",
  whatsNew: process.env.NEXT_PUBLIC_WHATS_NEW === "1" || process.env.NEXT_PUBLIC_DEMO === "1",

  // MVP feature gates - default OFF to reduce surface area
  discover: process.env.NEXT_PUBLIC_FEATURE_DISCOVER === "1",
  pdf: process.env.NEXT_PUBLIC_FEATURE_PDF === "1",
  extension: process.env.NEXT_PUBLIC_FEATURE_EXTENSION === "1",
  publicApi: process.env.NEXT_PUBLIC_FEATURE_PUBLIC_API === "1",
  widgets: process.env.NEXT_PUBLIC_FEATURE_WIDGETS === "1",
  vision: process.env.NEXT_PUBLIC_FEATURE_VISION === "1",
  owners: process.env.NEXT_PUBLIC_FEATURE_OWNERS === "1",
  agents: process.env.NEXT_PUBLIC_FEATURE_AGENTS === "1",

  /** When "1", show extra product links (e.g. Estimare) in main nav. Default: buyer-report focus. */
  secondaryProductNav: process.env.NEXT_PUBLIC_SECONDARY_PRODUCT_NAV === "1",

  /**
   * When "1", the UI may treat the multi-report bundle as a real product (checkout still TBD).
   * Default: show bundle as "în curând" on pricing.
   */
  reportBundle: process.env.NEXT_PUBLIC_FEATURE_REPORT_BUNDLE === "1",

  /** Set "0" to hide the bundle column on /pricing. */
  pricingShowBundleCard: process.env.NEXT_PUBLIC_PRICING_SHOW_BUNDLE_CARD !== "0",

  /** Set "0" to hide the subscription (Pro) column on /pricing. */
  pricingShowSubscription: process.env.NEXT_PUBLIC_PRICING_SHOW_SUBSCRIPTION !== "0",

  /**
   * Show “Zone (București)” in the main public nav (e.g. /bucuresti).
   * Off by default so we don’t over-promise on area UX.
   */
  navBucharestZones: process.env.NEXT_PUBLIC_NAV_BUCHAREST_ZONES === "1",

  /**
   * Show /search in optional surfaces (e.g. CTA on city pages). Off by default (mock/weak).
   */
  navSearch: process.env.NEXT_PUBLIC_FEATURE_NAV_SEARCH === "1",

  /**
   * When "0", report unlock requires sign-in; guest Stripe checkout is disabled.
   * Paid reports must be listed under the user’s profile (“Rapoartele mele”).
   */
  reportUnlockGuestCheckout: process.env.NEXT_PUBLIC_REPORT_UNLOCK_GUEST_CHECKOUT !== "0",

  /** Early-launch copy (pricing, CTA) without hardcoding RON. Pair with `REPORT_UNLOCK_AMOUNT_CENTS` on server. */
  launchMode: process.env.NEXT_PUBLIC_LAUNCH_MODE === "1",
};
