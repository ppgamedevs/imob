import fs from "fs";
import path from "path";

type SeismicRow = {
  lat: number;
  lng: number;
  address?: string;
  // allow a few classes plus None
  level: "RS1" | "RS2" | "RS3" | "RS4" | "None";
  sourceUrl?: string;
};

// helpers for server-side public read
function slugifyCity(s?: string | null) {
  if (!s) return undefined;
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function readPublicJsonSync(relPath: string): unknown | null {
  try {
    const p = path.join(process.cwd(), "public", relPath.replace(/^\/+/, ""));
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CACHE_BY_CITY: Record<string, SeismicRow[]> = {};

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeAddress(addr?: string) {
  if (!addr) return "";
  return addr.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

async function loadDataset(city?: string | null): Promise<SeismicRow[]> {
  const slug = slugifyCity(city) || "bucuresti";
  if (CACHE_BY_CITY[slug]) return CACHE_BY_CITY[slug];

  // 1) Try server-side FS from /public
  const primary = readPublicJsonSync(`/data/seismic/${slug}.json`);
  if (primary && Array.isArray(primary) && primary.length) {
    const mapped: SeismicRow[] = primary
      .map((obj: unknown) => {
        const o = obj as Record<string, unknown>;
        const lvlRaw = String(o.rs_class ?? o.level ?? o.risk ?? "").toUpperCase();
        const lvl =
          lvlRaw === "RS1" || lvlRaw === "RS2" || lvlRaw === "RS3" || lvlRaw === "RS4"
            ? (lvlRaw as SeismicRow["level"])
            : ("None" as SeismicRow["level"]);
        return {
          lat: Number(o.lat ?? o.latitude),
          lng: Number(o.lng ?? o.longitude),
          address: String(o.address ?? o.adresa ?? ""),
          level: lvl,
          sourceUrl: String(o.source_url ?? o.sourceUrl ?? o.url ?? "") || undefined,
        };
      })
      .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lng));
    CACHE_BY_CITY[slug] = mapped;
    return mapped;
  }

  // 2) Fallback to bundled sample
  const fallback = readPublicJsonSync(`/data/seismic/bucuresti.sample.json`);
  if (fallback && Array.isArray(fallback) && fallback.length) {
    const mapped: SeismicRow[] = fallback
      .map((obj: unknown) => {
        const o = obj as Record<string, unknown>;
        const lvlRaw = String(o.rs_class ?? o.level ?? o.risk ?? "").toUpperCase();
        const lvl =
          lvlRaw === "RS1" || lvlRaw === "RS2" || lvlRaw === "RS3" || lvlRaw === "RS4"
            ? (lvlRaw as SeismicRow["level"])
            : ("None" as SeismicRow["level"]);
        return {
          lat: Number(o.lat ?? o.latitude),
          lng: Number(o.lng ?? o.longitude),
          address: String(o.address ?? o.adresa ?? ""),
          level: lvl,
          sourceUrl: String(o.source_url ?? o.sourceUrl ?? o.url ?? "") || undefined,
        };
      })
      .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lng));
    CACHE_BY_CITY[slug] = mapped;
    return mapped;
  }

  // 3) As a last resort, try fetch (client-side)
  try {
    const res = await fetch(`/data/seismic/${slug}.json`);
    if (res.ok) {
      const data = (await res.json()) as SeismicRow[];
      CACHE_BY_CITY[slug] = data;
      return data;
    }
  } catch {}
  return [];
}

export async function matchSeismic(
  lat?: number | null,
  lng?: number | null,
  address?: string,
): Promise<{ level: "RS1" | "RS2" | "none"; sourceUrl?: string }> {
  const data = await loadDataset();
  if ((!lat || !lng) && !address) return { level: "none" };

  // If we have coordinates, try distance match (strict)
  if (typeof lat === "number" && typeof lng === "number") {
    let best: { row: SeismicRow; dist: number } | null = null;
    for (const row of data) {
      const d = haversineMeters(lat, lng, row.lat, row.lng);
      if (!best || d < best.dist) best = { row, dist: d };
    }
    if (best && best.dist <= 100) {
      const lvl = best.row.level === "RS1" || best.row.level === "RS2" ? best.row.level : "none";
      return { level: lvl, sourceUrl: best.row.sourceUrl };
    }
  }

  // Try address correlation: normalize and search for street+number tokens
  if (address) {
    const norm = normalizeAddress(address);
    for (const row of data) {
      if (!row.address) continue;
      const rnorm = normalizeAddress(row.address);
      // simple substring match
      if ((rnorm && norm.includes(rnorm)) || (rnorm && rnorm.includes(norm))) {
        const lvl = row.level === "RS1" || row.level === "RS2" ? row.level : "none";
        return { level: lvl, sourceUrl: row.sourceUrl };
      }
      // match by street name token
      const streetTokens = rnorm.split(" ");
      for (const t of streetTokens) {
        if (t.length > 3 && norm.includes(t)) {
          const lvl = row.level === "RS1" || row.level === "RS2" ? row.level : "none";
          return { level: lvl, sourceUrl: row.sourceUrl };
        }
      }
    }
  }

  return { level: "none" };
}

// named export only

// Extended estimator returning a richer result (confidence, method, note)
export type SeismicResult = {
  riskClass: "RS1" | "RS2" | "RS3" | "RS4" | "None" | "Unknown";
  confidence: number; // 0..1
  source?: string | null;
  method: "dataset-geo" | "dataset-address" | "heuristic";
  note?: string | null;
};

function heuristicByYear(yearBuilt?: number | null) {
  if (!yearBuilt) return { riskClass: "Unknown" as const, note: "no_year" };
  if (yearBuilt < 1940) return { riskClass: "RS1" as const, note: "pre-1940" };
  if (yearBuilt < 1963) return { riskClass: "RS2" as const, note: "1940-1962" };
  if (yearBuilt < 1978) return { riskClass: "RS3" as const, note: "1963-1977" };
  if (yearBuilt < 1990) return { riskClass: "RS4" as const, note: "1978-1989" };
  return { riskClass: "None" as const, note: ">=1990" };
}

// This function implements the higher-level strategy described in the design.
export async function estimateSeismic(features: unknown): Promise<SeismicResult> {
  const f = (features as Record<string, unknown>) ?? {};
  const rows: SeismicRow[] = await loadDataset((f.city as string) ?? null);
  const lat = (f.lat as number) ?? null;
  const lng = (f.lng as number) ?? null;
  const addressRaw = (f.addressRaw as string) ?? (f.address as string) ?? null;

  // 1) Geo nearest within 40m
  if (lat != null && lng != null && rows.length) {
    let best: { row: SeismicRow; dist: number } | null = null;
    for (const r of rows) {
      const d = haversineMeters(lat, lng, r.lat, r.lng);
      if (!best || d < best.dist) best = { row: r, dist: d };
    }
    if (best && best.dist <= 40) {
      return {
        riskClass: best.row.level ?? "Unknown",
        confidence: 0.95,
        source: best.row.sourceUrl ?? null,
        method: "dataset-geo",
        note: `d=${Math.round(best.dist)}m`,
      };
    }
  }

  // 2) Address fuzzy
  if (addressRaw && rows.length) {
    const q = normalizeAddress(addressRaw);
    const hit = rows.find((r: SeismicRow) => {
      if (!r.address) return false;
      const rnorm = normalizeAddress(r.address);
      if (!rnorm) return false;
      // check substring of the query or row
      if (q.includes(rnorm) || rnorm.includes(q)) return true;
      // street token match
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

  // 3) Heuristic by yearBuilt
  const h = heuristicByYear((f.yearBuilt as number) ?? null);
  return {
    riskClass: h.riskClass,
    confidence: 0.35,
    method: "heuristic",
    note: h.note ?? null,
  };
}
