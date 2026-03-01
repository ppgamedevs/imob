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
};
