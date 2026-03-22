/**
 * Dedupe: duplicate OSM ids + near-identical same-category features (node vs way).
 */
import { haversineM } from "@/lib/geo";
import type { NormalizedPoi } from "@/lib/geo/poi/types";

const NEAR_M = 26;

function normName(name: string | undefined): string | null {
  if (!name?.trim()) return null;
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function dedupeNormalizedPois(pois: NormalizedPoi[]): NormalizedPoi[] {
  const byId = new Map<string, NormalizedPoi>();
  for (const p of pois) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  const sorted = [...byId.values()].sort((a, b) => a.distanceM - b.distanceM || a.id.localeCompare(b.id));
  const out: NormalizedPoi[] = [];

  for (const p of sorted) {
    let drop = false;
    for (const q of out) {
      if (p.category !== q.category) continue;
      const d = haversineM(p.lat, p.lng, q.lat, q.lng);
      if (d > NEAR_M) continue;
      const n1 = normName(p.name);
      const n2 = normName(q.name);
      if (n1 && n2 && n1 === n2) {
        drop = true;
        break;
      }
      if (!n1 && !n2 && d < 14) {
        drop = true;
        break;
      }
    }
    if (!drop) out.push(p);
  }

  return out;
}
