/**
 * Day 25 - Adapter Registry
 * Pluggable source adapters
 */

import type { SourceAdapter } from "../types";
import { adapterGeneric } from "./generic";
import { adapterImobiliare } from "./imobiliare";
import { adapterOlx } from "./olx";
import { adapterStoria } from "./storia";

export const ADAPTERS: SourceAdapter[] = [
  adapterImobiliare,
  adapterStoria,
  adapterOlx,
  adapterGeneric, // Fallback
];

/**
 * Pick the best adapter for a given URL
 * Falls back to generic adapter if no specific match
 */
export function pickAdapter(u: URL): SourceAdapter {
  const host = u.hostname.replace(/^www\./, "");
  return ADAPTERS.find((a) => a.domain === host) || adapterGeneric;
}
