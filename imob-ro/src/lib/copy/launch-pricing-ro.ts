import { flags } from "@/lib/flags";

/** Badge near unlock price (pricing card, report preview) when `NEXT_PUBLIC_LAUNCH_MODE=1`. */
export function getLaunchPriceBadgeRo(): string | null {
  return flags.launchMode ? "Preț de lansare" : null;
}

/** Optional line for homepage final CTA when launch mode is on. */
export function getHomeLaunchPricingLineRo(): string | null {
  return flags.launchMode ? "Primele rapoarte sunt la preț de lansare." : null;
}
