import type { SourceAdapter } from "../types";
import { adapterGeneric } from "./generic";
import { adapterImobiliare } from "./imobiliare";
import { adapterLajumate } from "./lajumate";
import { adapterOlx } from "./olx";
import { adapterPubli24 } from "./publi24";
import { adapterStoria } from "./storia";

export const ADAPTERS: SourceAdapter[] = [
  adapterImobiliare,
  adapterStoria,
  adapterOlx,
  adapterPubli24,
  adapterLajumate,
  adapterGeneric,
];

export function pickAdapter(u: URL): SourceAdapter {
  const host = u.hostname.replace(/^www\./, "");
  return ADAPTERS.find((a) => a.domain === host) || adapterGeneric;
}
