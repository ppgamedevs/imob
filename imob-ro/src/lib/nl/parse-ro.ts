/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Lightweight Romanian NL parser for property search queries.
// Exports: parseRomanianQuery(text: string) => { filters, score, original }
// Filters shape (partial): { price?: { op: 'lt'|'gt'|'between', value?: number, low?: number, high?: number },
// rooms?: { exact?: number, min?: number, max?: number }, neighborhood?: string, nearMetro?: boolean, areaM2?: { op:'lt'|'gt'|'between', value?: number, low?: number, high?: number } }

function parseNumberRo(numStr: string): number | null {
  if (!numStr) return null;
  // remove thousands separators and non-digits except dot/comma
  const cleaned = numStr.replace(/\s|\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractPrice(text: string) {
  // examples: "sub 100k", "între 50k și 70k", "până la 300000", "max 200000", ">300k"

  // look for between: între X și Y, intre X si Y
  const between = text.match(/\bîntre\s+([0-9.,\skK]+)\s*(?:și|si|-)\s*([0-9.,\skK]+)\b/i);
  if (between) {
    const a = parseNumberRo(between[1].replace(/k/i, "000"));
    const b = parseNumberRo(between[2].replace(/k/i, "000"));
    if (a != null && b != null) return { op: "between", low: Math.min(a, b), high: Math.max(a, b) };
  }

  // less than: sub X, până la X, pana la X, <X, max X
  const lt = text.match(/\b(sub|până la|pana la|pana|până|pana|<|max)\s+([0-9.,\skK]+)\b/i);
  if (lt) {
    const n = parseNumberRo(lt[2].replace(/k/i, "000"));
    if (n != null) return { op: "lt", value: n };
  }

  // greater than: peste X, >X, minim X, min X
  const gt = text.match(/\b(peste|>\s*|minim|min)\s+([0-9.,\skK]+)\b/i);
  if (gt) {
    const n = parseNumberRo(gt[2].replace(/k/i, "000"));
    if (n != null) return { op: "gt", value: n };
  }

  // direct amounts: e.g., "100000" or "100k"
  const direct = text.match(/\b([0-9]{3,}[0-9kK,.\s]*)\b/);
  if (direct) {
    const n = parseNumberRo(direct[1].replace(/k/i, "000"));
    if (n != null) return { op: "lt", value: n };
  }

  return null;
}

function extractArea(text: string) {
  // m2: "50 m2", "peste 70 m²", "între 30 și 50 m2"

  const between = text.match(
    /\bîntre\s+([0-9.,\s]+)\s*(?:m|m2|m²)\s*(?:și|si|-)\s*([0-9.,\s]+)\s*(?:m|m2|m²)?\b/i,
  );
  if (between) {
    const a = parseNumberRo(between[1]);
    const b = parseNumberRo(between[2]);
    if (a != null && b != null) return { op: "between", low: Math.min(a, b), high: Math.max(a, b) };
  }
  const lt = text.match(/\b(sub|până la|pana la|<|max)\s+([0-9.,\s]+)\s*(?:m|m2|m²)\b/i);
  if (lt) {
    const n = parseNumberRo(lt[2]);
    if (n != null) return { op: "lt", value: n };
  }
  const gt = text.match(/\b(peste|>|minim|min)\s+([0-9.,\s]+)\s*(?:m|m2|m²)\b/i);
  if (gt) {
    const n = parseNumberRo(gt[2]);
    if (n != null) return { op: "gt", value: n };
  }
  const direct = text.match(/\b([0-9]{2,3})\s*(?:m|m2|m²)\b/i);
  if (direct) {
    const n = parseNumberRo(direct[1]);
    if (n != null) return { op: "gt", value: n };
  }
  return null;
}

function extractRooms(text: string) {
  // camere: 2 camere, 3 camere, garsoniera (1 camera)
  const m = text.match(/\b(garsonier[aă]|stud?io)\b/i);
  if (m) return { exact: 1 };
  const rooms = text.match(/\b([0-9])\s*(?:camere|camera|cam|cam\.|camere?)\b/i);
  if (rooms) {
    const n = parseInt(rooms[1], 10);
    if (!Number.isNaN(n)) return { exact: n };
  }
  // minim: cel putin 2 camere
  const min = text.match(/\b(cel puțin|cel putin|minim|>=)\s*([0-9])\b/i);
  if (min) {
    const n = parseInt(min[2], 10);
    if (!Number.isNaN(n)) return { min: n };
  }
  return null;
}

function extractNeighborhood(text: string) {
  // heuristics: look for "în <neighborhood>" or "cartier <name>" or capitalized words frequently used
  const m = text.match(/\b(cartier|în|in|zona|zona)\s+([A-ZĂÂÎȘȚa-zăâîșț0-9\-\s]+?)\b(?=\s|,|$)/i);
  if (m) {
    const name = m[2].trim();
    // crude filter: short names only
    if (name.length > 1 && name.length < 50) return name;
  }
  // common phrase: "lângă metrou <stație>" -> but neighborhood may follow 'lângă'
  const near = text.match(/\blâng[ăa]\s+metrou(?:\s+([A-ZĂÂÎȘȚa-zăâîșț0-9\-\s]+))?/i);
  if (near) return null; // we'll mark nearMetro separately

  // fallback: attempt to find capitalized noun sequences (2 words)
  const cap = text.match(/\b([A-ZĂÂÎȘȚ][a-zăâîșț]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+){0,2})\b/);
  if (cap) return cap[1];
  return null;
}

export function parseRomanianQuery(text: string) {
  const orig = String(text || "").trim();
  const filters: any = {};

  const price = extractPrice(orig);
  if (price) filters.price = price;

  const area = extractArea(orig);
  if (area) filters.areaM2 = area;

  const rooms = extractRooms(orig);
  if (rooms) filters.rooms = rooms;

  const nearMetro = /\blâng[ăa]\s+metrou\b/i.test(orig) || /\bnear metro\b/i.test(orig);
  if (nearMetro) filters.nearMetro = true;

  const neighborhood = extractNeighborhood(orig);
  if (neighborhood) filters.neighborhood = neighborhood;

  // compute a simple confidence score: proportion of recognized slots
  const slots = ["price", "areaM2", "rooms", "nearMetro", "neighborhood"];
  let matched = 0;
  for (const s of slots) if (filters[s]) matched++;
  const score = Math.min(1, Math.max(0, matched / Math.max(1, slots.length)));

  return { original: orig, filters, score } as { original: string; filters: any; score: number };
}

export default parseRomanianQuery;
