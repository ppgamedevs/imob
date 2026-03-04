/**
 * Import POIs from OpenStreetMap via Overpass API into the GeoPOI table.
 *
 * Usage:
 *   pnpm tsx scripts/geo/import-poi-osm.ts
 *
 * Environment:
 *   OVERPASS_URL  — Overpass API endpoint (default: https://overpass-api.de/api/interpreter)
 *   DATABASE_URL  — Required: Prisma connection string
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OVERPASS_URL =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

// Bucharest bounding box (slightly generous)
const BBOX = "44.33,25.93,44.55,26.25";

type PoiCategory =
  | "BAR"
  | "RESTAURANT"
  | "NIGHTCLUB"
  | "PARK"
  | "SCHOOL"
  | "KINDERGARTEN"
  | "PLAYGROUND"
  | "SUPERMARKET"
  | "PHARMACY"
  | "GYM";

interface RawPOI {
  osmId: string;
  lat: number;
  lng: number;
  category: PoiCategory;
  name: string | null;
}

// Maps OSM tags → our PoiCategory
const TAG_MAP: {
  key: string;
  value: string | string[];
  category: PoiCategory;
}[] = [
  { key: "amenity", value: "bar", category: "BAR" },
  { key: "amenity", value: "pub", category: "BAR" },
  { key: "amenity", value: "restaurant", category: "RESTAURANT" },
  { key: "amenity", value: "cafe", category: "RESTAURANT" },
  { key: "amenity", value: "fast_food", category: "RESTAURANT" },
  { key: "amenity", value: "nightclub", category: "NIGHTCLUB" },
  { key: "leisure", value: "park", category: "PARK" },
  { key: "leisure", value: "garden", category: "PARK" },
  { key: "amenity", value: "school", category: "SCHOOL" },
  { key: "amenity", value: "kindergarten", category: "KINDERGARTEN" },
  { key: "leisure", value: "playground", category: "PLAYGROUND" },
  { key: "shop", value: "supermarket", category: "SUPERMARKET" },
  { key: "amenity", value: "pharmacy", category: "PHARMACY" },
  { key: "leisure", value: "fitness_centre", category: "GYM" },
  { key: "leisure", value: "sports_centre", category: "GYM" },
];

function buildOverpassQuery(): string {
  const filters = TAG_MAP.map((t) => {
    const vals = Array.isArray(t.value) ? t.value : [t.value];
    return vals
      .map(
        (v) =>
          `  node["${t.key}"="${v}"](${BBOX});\n  way["${t.key}"="${v}"](${BBOX});`,
      )
      .join("\n");
  }).join("\n");

  return `
[out:json][timeout:120];
(
${filters}
);
out center tags;
`.trim();
}

function categorizeElement(tags: Record<string, string>): PoiCategory | null {
  for (const mapping of TAG_MAP) {
    const vals = Array.isArray(mapping.value)
      ? mapping.value
      : [mapping.value];
    if (vals.includes(tags[mapping.key])) {
      return mapping.category;
    }
  }
  return null;
}

async function fetchOverpass(query: string): Promise<unknown[]> {
  console.log(`Querying Overpass API: ${OVERPASS_URL}`);
  console.log(`Query length: ${query.length} chars`);

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { elements?: unknown[] };
  return json.elements ?? [];
}

function parseElements(elements: unknown[]): RawPOI[] {
  const pois: RawPOI[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const e = el as {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    };

    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;

    const tags = e.tags ?? {};
    const category = categorizeElement(tags);
    if (!category) continue;

    const osmId = `${e.type}/${e.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    pois.push({
      osmId,
      lat,
      lng,
      category,
      name: tags.name ?? tags["name:ro"] ?? null,
    });
  }

  return pois;
}

async function main() {
  console.log("=== OSM POI Importer for Bucharest ===\n");

  const query = buildOverpassQuery();
  const elements = await fetchOverpass(query);
  console.log(`Received ${elements.length} elements from Overpass\n`);

  const pois = parseElements(elements);
  console.log(`Parsed ${pois.length} unique POIs\n`);

  if (pois.length === 0) {
    console.warn("No POIs parsed. Check Overpass query or connectivity.");
    process.exit(1);
  }

  // Stats
  const byCat: Record<string, number> = {};
  for (const p of pois) {
    byCat[p.category] = (byCat[p.category] ?? 0) + 1;
  }
  console.log("By category:");
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log();

  let created = 0;
  let updated = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < pois.length; i += BATCH_SIZE) {
    const batch = pois.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((poi) =>
        prisma.geoPOI.upsert({
          where: { osmId: poi.osmId },
          update: {
            lat: poi.lat,
            lng: poi.lng,
            category: poi.category,
            name: poi.name,
            source: "OSM",
          },
          create: {
            osmId: poi.osmId,
            lat: poi.lat,
            lng: poi.lng,
            category: poi.category,
            name: poi.name,
            source: "OSM",
          },
        }),
      ),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const rec = r.value;
        if (rec.createdAt.getTime() === rec.updatedAt.getTime()) created++;
        else updated++;
      } else {
        errors++;
      }
    }

    const done = Math.min(i + BATCH_SIZE, pois.length);
    if (done % 500 === 0 || done === pois.length) {
      console.log(`Progress: ${done}/${pois.length} (created: ${created}, updated: ${updated}, errors: ${errors})`);
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in DB: ${await prisma.geoPOI.count()}`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
