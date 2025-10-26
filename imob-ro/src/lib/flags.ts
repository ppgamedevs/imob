/**
 * Feature flags system
 * Step 15: Final Polish
 *
 * Centralized feature toggles for demo, tour, ads, and other features
 */

export const flags = {
  demo: process.env.NEXT_PUBLIC_DEMO === "1",
  tour: process.env.NEXT_PUBLIC_TOUR === "1",
  ads: process.env.NEXT_PUBLIC_ADS !== "0",
  devProjects: process.env.NEXT_PUBLIC_DEV_PROJECTS === "1",
  whatsNew: process.env.NEXT_PUBLIC_WHATS_NEW === "1" || process.env.NEXT_PUBLIC_DEMO === "1",
};
