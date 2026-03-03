import { toEur } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { gridSlug, nearestStationM, slugifyRo } from "@/lib/geo";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode/mapbox";
import normalizeModule from "@/lib/normalize";
import { NormalizedFeaturesSchema } from "@/lib/schemas/normalized-features";

const normalizeExtracted = (normalizeModule as any).default ?? (normalizeModule as any);
const deriveLevelImported = (normalizeModule as any).deriveLevel ?? undefined;

function deriveLevel(floor?: number | null, floorRaw?: string | null): number | null {
  if (deriveLevelImported) return deriveLevelImported(floor ?? undefined, floorRaw ?? undefined);
  if (floor != null) return floor;
  const raw = (floorRaw || "").toLowerCase().trim();
  if (!raw) return null;

  if (/\bparter\b/.test(raw)) return 0;
  if (/\bdemisol\b/.test(raw)) return -1;
  if (/\bmezanin\b/.test(raw)) return 0;
  if (/\bmansard[aă]\b/.test(raw)) return 99;

  // "etaj 3", "et. 3", "et 3"
  const etajMatch = raw.match(/(?:etaj|et\.?)\s*(\d{1,2})/i);
  if (etajMatch) return Number(etajMatch[1]);

  // "3/8", "1/4", "P/4" (floor/totalFloors)
  const slashMatch = raw.match(/^(p|\d{1,2})\s*\/\s*(\d{1,2})$/i);
  if (slashMatch) {
    const left = slashMatch[1].toLowerCase();
    return left === "p" ? 0 : Number(left);
  }

  // "etaj ideal 1/4" or "etaj 2 din 8"
  const compoundMatch = raw.match(/(\d{1,2})\s*(?:\/|din)\s*\d{1,2}/);
  if (compoundMatch) return Number(compoundMatch[1]);

  // bare digit
  const digitMatch = raw.match(/^(\d{1,2})$/);
  if (digitMatch) return Number(digitMatch[1]);

  return null;
}

function deriveRoomsFromTitle(title?: string | null, rooms?: number | null): number | null {
  if (rooms != null) return rooms;
  if (!title) return null;
  const t = title.toLowerCase();
  if (/\bgarsonier[aă]\b/.test(t) || /\bstud?io\b/.test(t)) return 1;
  const m = t.match(/(\d)\s*(?:camere|camera|cam\.?)\b/);
  return m ? Number(m[1]) : null;
}

function normalizeExtractedWrapper(raw: any) {
  const n = normalizeExtracted ? normalizeExtracted(raw) : raw || {};
  const priceEur = toEur(
    raw.price ?? (n.price_eur as number | undefined),
    raw.currency ?? n.currency ?? "EUR",
  );
  const floorRaw = raw.floorRaw ?? n.floor_raw ?? null;
  const level = deriveLevel(raw.floor ?? null, floorRaw);
  const areaM2 = raw.areaM2 ?? n.area_m2 ?? n.area_m2;
  const rawRooms = raw.rooms ?? n.rooms ?? null;
  const rooms = deriveRoomsFromTitle(raw.title ?? n.title, rawRooms);
  const yearBuilt = raw.yearBuilt ?? n.year_built ?? n.year;
  const lat = raw.lat ?? n.lat;
  const lng = raw.lng ?? n.lng;
  return { ...(n || {}), priceEur, areaM2, rooms, level, floorRaw, yearBuilt, lat, lng };
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
