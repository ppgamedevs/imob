/**
 * Day 25 - Adapter Registry
 * Pluggable source adapters
 */

import type { SourceAdapter } from "../types";
import { adapterGeneric } from "./generic";

// TODO: Add domain-specific adapters here
// import { adapterOlxRo } from "./olx-ro";
// import { adapterImobiliareRo } from "./imobiliare-ro";

export const ADAPTERS: SourceAdapter[] = [
  adapterGeneric,
  // adapterOlxRo,
  // adapterImobiliareRo,
];

/**
 * Pick the best adapter for a given URL
 * Falls back to generic adapter if no specific match
 */
export function pickAdapter(u: URL): SourceAdapter {
  const host = u.hostname.replace(/^www\./, "");
  return ADAPTERS.find((a) => a.domain === host) || adapterGeneric;
}
