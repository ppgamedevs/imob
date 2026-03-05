/**
 * Shared geo utilities - single source of truth for haversine, slugify, metro.
 */

import { EARTH_RADIUS_M } from "@/lib/constants";
import { METRO_STATIONS } from "@/lib/data/metro";

/** Haversine distance in meters between two lat/lng points. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Find nearest metro station from our static dataset. */
export function nearestStationM(lat: number, lng: number): { name: string; distM: number } | null {
  if (lat == null || lng == null) return null;
  let best: { name: string; distM: number } | null = null;
  for (const s of METRO_STATIONS) {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (!best || d < best.distM) best = { name: s.name, distM: d };
  }
  return best;
}

const KNOWN_NEIGHBORHOODS: { name: string; lat: number; lng: number }[] = [
  { name: "Militari", lat: 44.4344, lng: 25.9955 },
  { name: "Militari Residence", lat: 44.4255, lng: 25.9728 },
  { name: "Drumul Taberei", lat: 44.4196, lng: 26.0314 },
  { name: "Rahova", lat: 44.4089, lng: 26.0728 },
  { name: "Berceni", lat: 44.3825, lng: 26.1251 },
  { name: "Colentina", lat: 44.4669, lng: 26.1305 },
  { name: "Pantelimon", lat: 44.4313, lng: 26.2009 },
  { name: "Floreasca", lat: 44.462, lng: 26.1012 },
  { name: "Dorobanti", lat: 44.4531, lng: 26.0919 },
  { name: "Tineretului", lat: 44.4137, lng: 26.1056 },
  { name: "Cotroceni", lat: 44.4348, lng: 26.0655 },
  { name: "Giulesti", lat: 44.459, lng: 26.0402 },
  { name: "Baneasa", lat: 44.4938, lng: 26.0764 },
  { name: "Herastrau", lat: 44.4753, lng: 26.0801 },
  { name: "Primaverii", lat: 44.4639, lng: 26.0811 },
  { name: "Domenii", lat: 44.4632, lng: 26.0611 },
  { name: "13 Septembrie", lat: 44.4258, lng: 26.076 },
  { name: "Sebastian", lat: 44.4178, lng: 26.0651 },
  { name: "Ferentari", lat: 44.4074, lng: 26.0679 },
  { name: "Giurgiului", lat: 44.3953, lng: 26.0943 },
  { name: "Vitan", lat: 44.4173, lng: 26.1254 },
  { name: "Decebal", lat: 44.4283, lng: 26.1187 },
  { name: "Alba Iulia", lat: 44.4271, lng: 26.1198 },
  { name: "Popesti Leordeni", lat: 44.3775, lng: 26.1629 },
  { name: "Voluntari", lat: 44.4908, lng: 26.1507 },
  { name: "Chiajna", lat: 44.4431, lng: 25.9797 },
  { name: "Bragadiru", lat: 44.3736, lng: 26.0349 },
  { name: "Titan", lat: 44.4218, lng: 26.1706 },
  { name: "Dristor", lat: 44.4202, lng: 26.1405 },
  { name: "Obor", lat: 44.4507, lng: 26.1304 },
  { name: "Pallady", lat: 44.4104, lng: 26.2283 },
  { name: "Metalurgiei", lat: 44.3746, lng: 26.1322 },
  { name: "Mihai Bravu", lat: 44.4254, lng: 26.1402 },
  { name: "Iancului", lat: 44.437, lng: 26.1401 },
  { name: "Pipera", lat: 44.4929, lng: 26.1232 },
  { name: "Aviatiei", lat: 44.4803, lng: 26.0845 },
  { name: "Aviatorilor", lat: 44.4637, lng: 26.0842 },
  { name: "Unirii", lat: 44.4274, lng: 26.1032 },
  { name: "Crangasi", lat: 44.4606, lng: 26.0488 },
  { name: "Lujerului", lat: 44.4325, lng: 26.0325 },
  { name: "Ghencea", lat: 44.4148, lng: 26.0454 },
  { name: "Splaiul Independentei", lat: 44.4346, lng: 26.0758 },
  { name: "Aparatorii Patriei", lat: 44.3855, lng: 26.1367 },
  { name: "Brancoveanu", lat: 44.3941, lng: 26.1191 },
  { name: "Damaroaia", lat: 44.4797, lng: 26.0541 },
  { name: "Bucurestii Noi", lat: 44.4765, lng: 26.0527 },
  { name: "Pajura", lat: 44.4842, lng: 26.0658 },
  { name: "Straulesti", lat: 44.4909, lng: 26.0451 },
  { name: "Cismigiu", lat: 44.4363, lng: 26.0899 },
  { name: "Romana", lat: 44.4469, lng: 26.0969 },
  { name: "Victoriei", lat: 44.4521, lng: 26.0854 },
  { name: "Fundeni", lat: 44.4506, lng: 26.1731 },
  { name: "Prelungirea Ghencea", lat: 44.4005, lng: 26.0354 },
];

const KNOWN_COMPLEXES: { name: string; lat: number; lng: number }[] = [
  { name: "Green Lake", lat: 44.4767, lng: 26.0723 },
  { name: "Greenfield", lat: 44.3775, lng: 26.1629 },
  { name: "Greenfield Residence", lat: 44.3775, lng: 26.1629 },
  { name: "One Herastrau", lat: 44.4808, lng: 26.0759 },
  { name: "One Floreasca City", lat: 44.4621, lng: 26.1016 },
  { name: "One Verdi Park", lat: 44.4559, lng: 26.0636 },
  { name: "One Peninsula", lat: 44.4754, lng: 26.0767 },
  { name: "One Cotroceni Park", lat: 44.4323, lng: 26.0589 },
  { name: "One Lake District", lat: 44.4767, lng: 26.0723 },
  { name: "One Lake Club", lat: 44.4767, lng: 26.0723 },
  { name: "One United Tower", lat: 44.4365, lng: 26.0976 },
  { name: "Cortina Residence", lat: 44.4602, lng: 26.1053 },
  { name: "Cortina North", lat: 44.4825, lng: 26.0846 },
  { name: "Aviatiei Park", lat: 44.4830, lng: 26.0835 },
  { name: "Belvedere Residence", lat: 44.4574, lng: 26.0973 },
  { name: "Central District", lat: 44.4353, lng: 26.0963 },
  { name: "Cosmopolis", lat: 44.5015, lng: 26.1601 },
  { name: "Gran Via Park", lat: 44.4192, lng: 26.0317 },
  { name: "Novum Residence", lat: 44.4609, lng: 26.1019 },
  { name: "Parcul 20", lat: 44.4200, lng: 26.0310 },
  { name: "Cloud 9", lat: 44.4564, lng: 26.1120 },
  { name: "Sema Parc", lat: 44.4498, lng: 26.0549 },
  { name: "West Park Residence", lat: 44.4291, lng: 25.9902 },
  { name: "Ivory Residence", lat: 44.4932, lng: 26.0781 },
  { name: "Laguna Residence", lat: 44.4098, lng: 26.1233 },
  { name: "New Point", lat: 44.4229, lng: 26.1146 },
  { name: "Plaza Residence", lat: 44.4355, lng: 26.0945 },
  { name: "Metropolitan", lat: 44.4372, lng: 26.1001 },
  { name: "20th Residence", lat: 44.4200, lng: 26.0310 },
  { name: "21 Residence", lat: 44.4277, lng: 26.0965 },
  { name: "Herastrau Residence", lat: 44.4753, lng: 26.0801 },
  { name: "Baneasa Forest", lat: 44.4968, lng: 26.0764 },
  { name: "Pipera City", lat: 44.4929, lng: 26.1232 },
  { name: "Pipera Residence", lat: 44.4929, lng: 26.1232 },
  { name: "Alpha Residence", lat: 44.4888, lng: 26.1120 },
  { name: "Luxuria Residence", lat: 44.4680, lng: 26.0949 },
  { name: "Valletta Residence", lat: 44.4929, lng: 26.1232 },
  { name: "Vivenda Residence", lat: 44.4590, lng: 26.0975 },
  { name: "Parcul Floreasca", lat: 44.4633, lng: 26.0988 },
  { name: "Alia Apartments", lat: 44.4587, lng: 26.0960 },
  { name: "Upground Residence", lat: 44.4750, lng: 26.0879 },
  { name: "Nordis", lat: 44.4753, lng: 26.0801 },
  { name: "AFI City", lat: 44.4288, lng: 26.0330 },
  { name: "AFI Park", lat: 44.4288, lng: 26.0330 },
  { name: "AFI Tech Park", lat: 44.4288, lng: 26.0330 },
  { name: "Sophia Residence", lat: 44.4620, lng: 26.1060 },
  { name: "Rose Garden", lat: 44.4710, lng: 26.0760 },
  { name: "Victoriei Residence", lat: 44.4521, lng: 26.0854 },
  { name: "Eden Lake", lat: 44.4767, lng: 26.0723 },
  { name: "Amber Gardens", lat: 44.5015, lng: 26.1601 },
  { name: "Mia Dorului", lat: 44.4208, lng: 26.0445 },
  { name: "London Park Residence", lat: 44.4329, lng: 26.0035 },
  { name: "Rasarit de Soare", lat: 44.4348, lng: 26.1470 },
  { name: "Cartier Latin", lat: 44.4060, lng: 26.0543 },
  { name: "Natura Residence", lat: 44.4290, lng: 26.1530 },
  { name: "Marmura Residence", lat: 44.4400, lng: 26.1260 },
  { name: "Nusco City", lat: 44.4284, lng: 26.0331 },
  { name: "Arcadia Apartments", lat: 44.4605, lng: 26.0340 },
  { name: "Exigent Plaza", lat: 44.4330, lng: 26.1310 },
  { name: "Olimpia Residence", lat: 44.4650, lng: 26.0600 },
  { name: "Impact Boreal", lat: 44.4900, lng: 26.0750 },
  { name: "Nordului Residence", lat: 44.4750, lng: 26.0750 },
  { name: "Liziera de Lac", lat: 44.4820, lng: 26.0740 },
  { name: "Mioritic Residence", lat: 44.4050, lng: 26.0330 },
  { name: "Gafencu Residence", lat: 44.4720, lng: 26.0930 },
  { name: "Asmita Gardens", lat: 44.4120, lng: 26.1150 },
  { name: "Vox Vertical Village", lat: 44.4670, lng: 26.1130 },
  { name: "The Park", lat: 44.4350, lng: 26.0570 },
  { name: "West Side Park", lat: 44.4310, lng: 25.9960 },
  { name: "Panoramic Residence", lat: 44.4420, lng: 26.0420 },
  { name: "Maurer Residence", lat: 44.4290, lng: 26.0350 },
  { name: "Opera Residence", lat: 44.4290, lng: 26.0770 },
  { name: "Evocasa Optima", lat: 44.4290, lng: 25.9920 },
  { name: "Confort Urban", lat: 44.4280, lng: 25.9900 },
  { name: "Rotar Park", lat: 44.4270, lng: 25.9880 },
  { name: "Platinum Residence", lat: 44.4590, lng: 26.1010 },
  { name: "Emerald Residence", lat: 44.4600, lng: 26.1040 },
  { name: "Discovery Apartments", lat: 44.4620, lng: 26.0990 },
  { name: "Avrig Residence", lat: 44.4440, lng: 26.1160 },
  { name: "Riviera Luxury", lat: 44.4760, lng: 26.0780 },
  { name: "Lake House", lat: 44.4760, lng: 26.0760 },
  { name: "Horizon City", lat: 44.4929, lng: 26.1232 },
  { name: "Cavar Residence", lat: 44.3932, lng: 26.1210 },
];

function normText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Try to infer approximate lat/lng from text (title, description) by matching
 * known residential complexes, metro stations, or neighborhoods.
 * Priority: complex > metro > neighborhood.
 */
export function inferLocationFromText(
  ...texts: (string | null | undefined)[]
): { lat: number; lng: number; hint: string } | null {
  const combined = normText(texts.filter(Boolean).join(" "));
  if (!combined) return null;

  // Priority 1: known residential complexes (most specific)
  const cxSorted = [...KNOWN_COMPLEXES].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const c of cxSorted) {
    if (combined.includes(normText(c.name))) {
      return { lat: c.lat, lng: c.lng, hint: `complex ${c.name}` };
    }
  }

  // Priority 2: metro station match
  const sorted = [...METRO_STATIONS].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const s of sorted) {
    if (combined.includes(normText(s.name))) {
      return { lat: s.lat, lng: s.lng, hint: `aproape de metrou ${s.name}` };
    }
  }

  // Priority 3: neighborhood match (approximate center of area)
  const nbSorted = [...KNOWN_NEIGHBORHOODS].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const n of nbSorted) {
    if (combined.includes(normText(n.name))) {
      return { lat: n.lat, lng: n.lng, hint: `zona ${n.name}` };
    }
  }

  return null;
}

/**
 * Geocode an address string using Nominatim API (free, no key).
 * Used as a fallback when static inference fails.
 * Returns null if geocoding fails or times out.
 */
export async function geocodeWithNominatim(
  query: string,
): Promise<{ lat: number; lng: number; display: string } | null> {
  if (!query || query.length < 3) return null;
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "ro",
      addressdetails: "1",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "ImobIntel/1.0 (https://imobintel.ro)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < 43 || lat > 49 || lng < 20 || lng > 30) return null;
    return { lat, lng, display: first.display_name ?? query };
  } catch {
    return null;
  }
}

/**
 * Slugify a Romanian string: remove diacritics, lowercase, replace non-alnum with hyphens.
 * Returns undefined if input is empty/null.
 */
export function slugifyRo(s?: string | null): string | undefined {
  if (!s) return undefined;
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Geohash-style grid slug for lat/lng. */
export function gridSlug(lat?: number | null, lng?: number | null, p = 2): string | undefined {
  if (lat == null || lng == null) return undefined;
  return `g-${lat.toFixed(p)}-${lng.toFixed(p)}`;
}
