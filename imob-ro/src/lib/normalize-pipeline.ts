/* eslint-disable @typescript-eslint/no-explicit-any */
import { toEur } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { gridSlug, nearestStationM, slugifyRo } from "@/lib/geo";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode/mapbox";
import normalizeModule from "@/lib/normalize";
import { NormalizedFeaturesSchema } from "@/lib/schemas/normalized-features";

const normalizeExtracted = (normalizeModule as any).default ?? (normalizeModule as any);
const deriveLevelImported = (normalizeModule as any).deriveLevel ?? undefined;

function deriveLevel(floor?: number | null, floorRaw?: string | null) {
  if (deriveLevelImported) return deriveLevelImported(floor ?? undefined, floorRaw ?? undefined);
  if (floor != null) return floor;
  const raw = (floorRaw || "").toLowerCase();
  if (/parter/.test(raw)) return -1;
  if (/demisol/.test(raw)) return -2;
  if (/mezanin/.test(raw)) return 0;
  const m = raw.match(/etaj\s*(\d{1,2})/i);
  return m ? Number(m[1]) : null;
}

function normalizeExtractedWrapper(raw: any) {
  const n = normalizeExtracted ? normalizeExtracted(raw) : raw || {};
  const priceEur = toEur(
    raw.price ?? (n.price_eur as number | undefined),
    raw.currency ?? n.currency ?? "EUR",
  );
  const level = deriveLevel(raw.floor ?? null, raw.floorRaw ?? null);
  const areaM2 = raw.areaM2 ?? n.area_m2 ?? n.area_m2;
  const rooms = raw.rooms ?? n.rooms;
  const yearBuilt = raw.yearBuilt ?? n.year_built ?? n.year;
  const lat = raw.lat ?? n.lat;
  const lng = raw.lng ?? n.lng;
  return { ...(n || {}), priceEur, areaM2, rooms, level, yearBuilt, lat, lng };
}

export async function updateFeatureSnapshot(analysisId: string) {
  const a = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true },
  });
  if (!a?.extractedListing) throw new Error("No extracted data");

  const f = await Promise.resolve(normalizeExtractedWrapper(a.extractedListing as any));

  // geocode if missing coords
  let city: string | undefined, neighborhood: string | undefined;
  let lat = f.lat,
    lng = f.lng;
  if ((lat == null || lng == null) && a.extractedListing.addressRaw) {
    const g = await geocodeAddress(a.extractedListing.addressRaw as string);
    if (g) {
      lat = lat ?? g.lat;
      lng = lng ?? g.lng;
      city = g.city ?? city;
      neighborhood = g.neighborhood ?? neighborhood;
    }
  }

  if ((!city || !neighborhood) && lat != null && lng != null) {
    const r = await reverseGeocode(lat, lng);
    if (r) {
      city = city ?? r.city;
      neighborhood = neighborhood ?? r.neighborhood;
    }
  }

  // area slug
  let areaSlug: string | undefined;
  if (city && neighborhood && /bucure/i.test(city)) {
    areaSlug = slugifyRo(`bucuresti-${neighborhood}`);
  } else if (lat != null && lng != null) {
    areaSlug = gridSlug(lat, lng, 2);
  }

  // distance to metro
  let distMetroM: number | undefined;
  if (lat != null && lng != null) {
    const st = nearestStationM(lat, lng);
    if (st) distMetroM = Math.round(st.distM);
  }

  const features = { ...f, lat, lng, city, areaSlug, distMetroM };

  // validate/sanitize using Zod schema when available; if validation fails, log and persist raw features
  try {
    const parsed = NormalizedFeaturesSchema.parse(features as any);
    await prisma.featureSnapshot.upsert({
      where: { analysisId },
      update: { features: parsed as any },
      create: { analysisId, features: parsed as any },
    });
  } catch (e) {
    console.warn("Normalized features validation failed; persisting raw features", e);
    await prisma.featureSnapshot.upsert({
      where: { analysisId },
      update: { features },
      create: { analysisId, features },
    });
  }

  return features;
}
