import fs from "fs";
import path from "path";

type SeismicRow = {
  lat: number;
  lng: number;
  address?: string;
  level: "RS1" | "RS2";
  sourceUrl?: string;
};

let cached: SeismicRow[] | null = null;

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

function parseCSV(content: string): SeismicRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: SeismicRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = cols[j] ?? "";
    }
    const lat = parseFloat(obj.lat ?? obj.latitude ?? "");
    const lng = parseFloat(obj.lng ?? obj.longitude ?? obj.lon ?? "");
    const levelRaw = (obj.level ?? obj.risk ?? "").toUpperCase();
    const level = levelRaw === "RS1" ? "RS1" : levelRaw === "RS2" ? "RS2" : null;
    if (!isNaN(lat) && !isNaN(lng) && level) {
      rows.push({
        lat,
        lng,
        address: obj.address ?? obj.adresa ?? "",
        level,
        sourceUrl: obj.sourceurl ?? obj.source_url ?? obj.url ?? undefined,
      });
    }
  }
  return rows;
}

async function loadSeismicData(): Promise<SeismicRow[]> {
  if (cached) return cached;
  // Try local files first
  const cwd = process.cwd();
  const jsonPath = path.join(cwd, "data", "seismic.json");
  const csvPath = path.join(cwd, "data", "seismic.csv");
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        cached = parsed
          .map((r: unknown) => {
            const obj = r as Record<string, unknown>;
            const lvlRaw = String(obj.level ?? obj.risk ?? "").toUpperCase();
            const lvl: "RS1" | "RS2" | null =
              lvlRaw === "RS1" ? "RS1" : lvlRaw === "RS2" ? "RS2" : null;
            return {
              lat: Number(obj.lat ?? obj.latitude),
              lng: Number(obj.lng ?? obj.longitude),
              address: (obj.address ?? obj.adresa ?? "") as string,
              level: lvl,
              sourceUrl: (obj.sourceUrl ?? obj.source_url) as string | undefined,
            } as SeismicRow;
          })
          .filter(
            (r) =>
              !Number.isNaN(r.lat) &&
              !Number.isNaN(r.lng) &&
              (r.level === "RS1" || r.level === "RS2"),
          );
        return cached;
      }
    }
    if (fs.existsSync(csvPath)) {
      const raw = fs.readFileSync(csvPath, "utf-8");
      cached = parseCSV(raw);
      return cached;
    }
  } catch {
    // swallow
  }

  // No local file: try environment URL
  const url = process.env.RS_PUBLIC_URL ?? process.env.SEISMIC_PUBLIC_URL;
  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      // try JSON first
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          cached = parsed
            .map((r: unknown) => {
              const obj = r as Record<string, unknown>;
              const lvlRaw = String(obj.level ?? obj.risk ?? "").toUpperCase();
              const lvl: "RS1" | "RS2" | null =
                lvlRaw === "RS1" ? "RS1" : lvlRaw === "RS2" ? "RS2" : null;
              return {
                lat: Number(obj.lat ?? obj.latitude),
                lng: Number(obj.lng ?? obj.longitude),
                address: (obj.address ?? obj.adresa ?? "") as string,
                level: lvl,
                sourceUrl: (obj.sourceUrl ?? obj.source_url) as string | undefined,
              } as SeismicRow;
            })
            .filter(
              (r) =>
                !Number.isNaN(r.lat) &&
                !Number.isNaN(r.lng) &&
                (r.level === "RS1" || r.level === "RS2"),
            );
          return cached;
        }
      } catch {
        // parse CSV
        cached = parseCSV(text);
        return cached;
      }
    } catch {
      return [];
    }
  }

  return [];
}

export async function matchSeismic(
  lat?: number | null,
  lng?: number | null,
  address?: string,
): Promise<{ level: "RS1" | "RS2" | "none"; sourceUrl?: string }> {
  const data = await loadSeismicData();
  if ((!lat || !lng) && !address) return { level: "none" };

  // If we have coordinates, try distance match (strict)
  if (typeof lat === "number" && typeof lng === "number") {
    let best: { row: SeismicRow; dist: number } | null = null;
    for (const row of data) {
      const d = haversineMeters(lat, lng, row.lat, row.lng);
      if (!best || d < best.dist) best = { row, dist: d };
    }
    if (best && best.dist <= 100) {
      return { level: best.row.level, sourceUrl: best.row.sourceUrl };
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
        return { level: row.level, sourceUrl: row.sourceUrl };
      }
      // match by street name token
      const streetTokens = rnorm.split(" ");
      for (const t of streetTokens) {
        if (t.length > 3 && norm.includes(t)) return { level: row.level, sourceUrl: row.sourceUrl };
      }
    }
  }

  return { level: "none" };
}

// named export only
