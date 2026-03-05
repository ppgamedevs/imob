export type PropertyType =
  | "apartament"
  | "garsoniera"
  | "casa"
  | "vila"
  | "studio"
  | "mansarda"
  | "penthouse"
  | "duplex"
  | "teren"
  | "spatiu_comercial"
  | "hala"
  | "birou"
  | "unknown";

const SUPPORTED_RESIDENTIAL: PropertyType[] = [
  "apartament",
  "garsoniera",
  "casa",
  "vila",
  "studio",
  "mansarda",
  "penthouse",
  "duplex",
];

const NON_RESIDENTIAL: PropertyType[] = [
  "teren",
  "spatiu_comercial",
  "hala",
  "birou",
];

export function detectPropertyType(
  title: string | null | undefined,
  rooms: number | null | undefined,
): PropertyType {
  const t = (title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (/\bteren\b/.test(t) || /\blocuri?\s+de\s+casa\b/.test(t)) return "teren";
  if (/\bhala\b|\bspatiu\s+(?:industrial|depozitare)\b/.test(t)) return "hala";
  if (/\bspatiu\s+comercial\b|\bmagazin\b/.test(t)) return "spatiu_comercial";
  if (/\bbirou\b|\boffice\b/.test(t)) return "birou";

  if (/\bvila\b|\bvile\b/.test(t)) return "vila";
  if (/\bcasa\b|\bcase\b/.test(t)) return "casa";
  if (/\bpenthouse\b/.test(t)) return "penthouse";
  if (/\bduplex\b/.test(t)) return "duplex";
  if (/\bmansarda\b/.test(t)) return "mansarda";
  if (/\bstudio\b/.test(t) && rooms === 1) return "studio";
  if (/\bgarsonier[aă]?\b/.test(t) || rooms === 1) return "garsoniera";

  return "apartament";
}

export function isResidential(type: PropertyType): boolean {
  return SUPPORTED_RESIDENTIAL.includes(type);
}

export function isNonResidential(type: PropertyType): boolean {
  return NON_RESIDENTIAL.includes(type);
}

export function isHouseType(type: PropertyType): boolean {
  return type === "casa" || type === "vila" || type === "duplex";
}

export function propertyTypeLabel(type: PropertyType): string {
  const LABELS: Record<PropertyType, string> = {
    apartament: "apartament",
    garsoniera: "garsoniera",
    casa: "casa",
    vila: "vila",
    studio: "studio",
    mansarda: "mansarda",
    penthouse: "penthouse",
    duplex: "duplex",
    teren: "teren",
    spatiu_comercial: "spatiu comercial",
    hala: "hala industriala",
    birou: "birou",
    unknown: "proprietate",
  };
  return LABELS[type] ?? "proprietate";
}

export function propertyScoreLabel(type: PropertyType): string {
  const LABELS: Record<PropertyType, string> = {
    apartament: "Scor apartament",
    garsoniera: "Scor garsoniera",
    casa: "Scor casa",
    vila: "Scor vila",
    studio: "Scor studio",
    mansarda: "Scor mansarda",
    penthouse: "Scor penthouse",
    duplex: "Scor duplex",
    teren: "Scor teren",
    spatiu_comercial: "Scor proprietate",
    hala: "Scor proprietate",
    birou: "Scor proprietate",
    unknown: "Scor proprietate",
  };
  return LABELS[type] ?? "Scor proprietate";
}

/**
 * Extract room count from title when the extracted value seems wrong.
 * Handles patterns like "Casa cu 7 camere", "3 camere", etc.
 */
export function extractRoomsFromTitle(title: string | null | undefined): number | null {
  if (!title) return null;
  const m = title.match(/\b(\d{1,2})\s*(?:camere|camera|cam\.?)\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 30) return n;
  }
  if (/\bgarsonier[aă]?\b/i.test(title) || /\bstudio\b/i.test(title)) return 1;
  return null;
}

/**
 * Sanitize rooms value: if it's unreasonably high, try to extract from title.
 */
export function sanitizeRooms(
  rooms: number | null | undefined,
  title: string | null | undefined,
): number | null {
  if (rooms != null && rooms >= 1 && rooms <= 20) return rooms;
  const fromTitle = extractRoomsFromTitle(title);
  if (fromTitle) return fromTitle;
  if (rooms != null && rooms > 20) return null;
  return rooms ?? null;
}
