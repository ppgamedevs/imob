import type { SourceAdapter } from "../types";
import { adapterGeneric } from "./generic";
import { adapterHomezz } from "./homezz";
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
  adapterHomezz,
  adapterGeneric,
];

export function pickAdapter(u: URL): SourceAdapter {
  let host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "m.publi24.ro") host = "publi24.ro";
  return ADAPTERS.find((a) => a.domain === host) || adapterGeneric;
}
