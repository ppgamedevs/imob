import fs from "fs";
import path from "path";

import { SEISMIC_GEO_MATCH_RADIUS_M, SEISMIC_LEGACY_MATCH_RADIUS_M } from "@/lib/constants";
import { haversineM, slugifyRo } from "@/lib/geo";
import type { SeismicResult } from "@/lib/types/pipeline";

type SeismicRow = {
  lat: number;
  lng: number;
  address?: string;
  level: "RS1" | "RS2" | "RS3" | "RS4" | "None";
  sourceUrl?: string;
};

function readPublicJsonSync(relPath: string): unknown | null {
  try {
    const p = path.join(process.cwd(), "public", relPath.replace(/^\/+/, ""));
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const CACHE_BY_CITY: Record<string, SeismicRow[]> = {};

function normalizeAddress(addr?: string): string {
  if (!addr) return "";
  return addr.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

function parseRows(data: unknown[]): SeismicRow[] {
  return data
    .map((obj) => {
      const o = obj as Record<string, unknown>;
      const lvlRaw = String(o.rs_class ?? o.level ?? o.risk ?? "").toUpperCase();
      const lvl =
        lvlRaw === "RS1" || lvlRaw === "RS2" || lvlRaw === "RS3" || lvlRaw === "RS4"
          ? (lvlRaw as SeismicRow["level"])
          : ("None" as const);
      return {
        lat: Number(o.lat ?? o.latitude),
        lng: Number(o.lng ?? o.longitude),
        address: String(o.address ?? o.adresa ?? ""),
        level: lvl,
        sourceUrl: String(o.source_url ?? o.sourceUrl ?? o.url ?? "") || undefined,
      };
    })
    .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lng));
}

async function loadDataset(city?: string | null): Promise<SeismicRow[]> {
  const slug = slugifyRo(city) || "bucuresti";
  if (CACHE_BY_CITY[slug]) return CACHE_BY_CITY[slug];

  const primary = readPublicJsonSync(`/data/seismic/${slug}.json`);
  if (primary && Array.isArray(primary) && primary.length) {
    CACHE_BY_CITY[slug] = parseRows(primary);
    return CACHE_BY_CITY[slug];
  }

  const fallback = readPublicJsonSync(`/data/seismic/bucuresti.sample.json`);
  if (fallback && Array.isArray(fallback) && fallback.length) {
    CACHE_BY_CITY[slug] = parseRows(fallback);
    return CACHE_BY_CITY[slug];
  }

  try {
    const res = await fetch(`/data/seismic/${slug}.json`);
    if (res.ok) {
      const data = (await res.json()) as SeismicRow[];
      CACHE_BY_CITY[slug] = data;
      return data;
    }
  } catch { /* fallback to empty */ }
  return [];
}

export async function matchSeismic(
  lat?: number | null,
  lng?: number | null,
  address?: string,
): Promise<{ level: "RS1" | "RS2" | "None"; sourceUrl?: string }> {
  const data = await loadDataset();
  if ((!lat || !lng) && !address) return { level: "None" };

  if (typeof lat === "number" && typeof lng === "number") {
    let best: { row: SeismicRow; dist: number } | null = null;
    for (const row of data) {
      const d = haversineM(lat, lng, row.lat, row.lng);
      if (!best || d < best.dist) best = { row, dist: d };
    }
    if (best && best.dist <= SEISMIC_LEGACY_MATCH_RADIUS_M) {
      const lvl = best.row.level === "RS1" || best.row.level === "RS2" ? best.row.level : "None";
      return { level: lvl, sourceUrl: best.row.sourceUrl };
    }
  }

  if (address) {
    const norm = normalizeAddress(address);
    for (const row of data) {
      if (!row.address) continue;
      const rnorm = normalizeAddress(row.address);
      if ((rnorm && norm.includes(rnorm)) || (rnorm && rnorm.includes(norm))) {
        const lvl = row.level === "RS1" || row.level === "RS2" ? row.level : "None";
        return { level: lvl, sourceUrl: row.sourceUrl };
      }
    }
  }

  return { level: "None" };
}

function heuristicByYear(yearBuilt?: number | null) {
  if (!yearBuilt) return { riskClass: "Unknown" as const, note: "no_year" };
  if (yearBuilt < 1940) return { riskClass: "RS1" as const, note: "pre-1940" };
  if (yearBuilt < 1963) return { riskClass: "RS2" as const, note: "1940-1962" };
  if (yearBuilt < 1978) return { riskClass: "RS3" as const, note: "1963-1977" };
  if (yearBuilt < 1990) return { riskClass: "RS4" as const, note: "1978-1989" };
  return { riskClass: "None" as const, note: ">=1990" };
}

export { type SeismicResult };

export async function estimateSeismic(features: Record<string, unknown>): Promise<SeismicResult> {
  const f = features ?? {};
  const rows = await loadDataset((f.city as string) ?? null);
  const lat = (f.lat as number) ?? null;
  const lng = (f.lng as number) ?? null;
  const addressRaw = (f.addressRaw as string) ?? (f.address as string) ?? null;

  if (lat != null && lng != null && rows.length) {
    let best: { row: SeismicRow; dist: number } | null = null;
    for (const r of rows) {
      const d = haversineM(lat, lng, r.lat, r.lng);
      if (!best || d < best.dist) best = { row: r, dist: d };
    }
    if (best && best.dist <= SEISMIC_GEO_MATCH_RADIUS_M) {
      return {
        riskClass: best.row.level ?? "Unknown",
        confidence: 0.95,
        source: best.row.sourceUrl ?? null,
        method: "dataset-geo",
        note: `d=${Math.round(best.dist)}m`,
      };
    }
  }

  if (addressRaw && rows.length) {
    const q = normalizeAddress(addressRaw);
    const hit = rows.find((r) => {
      if (!r.address) return false;
      const rnorm = normalizeAddress(r.address);
      if (!rnorm) return false;
      if (q.includes(rnorm) || rnorm.includes(q)) return true;
      const tokens = rnorm.split(" ");
      for (const t of tokens) {
        if (t.length > 3 && q.includes(t)) return true;
      }
      return false;
    });
    if (hit) {
      return {
        riskClass: hit.level ?? "Unknown",
        confidence: 0.6,
        source: hit.sourceUrl ?? null,
        method: "dataset-address",
        note: "fuzzy-address",
      };
    }
  }

  const h = heuristicByYear((f.yearBuilt as number) ?? null);
  return {
    riskClass: h.riskClass,
    confidence: 0.35,
    method: "heuristic",
    note: h.note ?? null,
  };
}
