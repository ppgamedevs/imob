export function stripTags(s?: string | null) {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").trim();
}
export function toNumberSafe(s?: string | null) {
  if (!s) return null;
  const t = s
    .replace(/\u00A0/g, " ")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!t) return null;
  // ro: punct ca separator mii, virgulă zecimală – transformăm în en-US
  const en = t.replace(/\./g, "").replace(",", ".");
  const n = Number(en);
  return Number.isFinite(n) ? n : null;
}
export function parseMoneyRo(s?: string | null): {
  value: number | null;
  currency: "EUR" | "RON" | "USD" | null;
} {
  if (!s) return { value: null, currency: null };
  const up = s.toUpperCase();
  const currency =
    up.includes("€") || up.includes("EUR")
      ? "EUR"
      : up.includes("LEI") || up.includes("RON")
        ? "RON"
        : up.includes("$") || up.includes("USD")
          ? "USD"
          : null;
  // extrage numere
  const val = toNumberSafe(up);
  return { value: val, currency };
}
export function parseArea(s?: string | null) {
  if (!s) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s?(m2|mp|m²)/i);
  return toNumberSafe(m?.[1] ?? s);
}
export function parseRooms(s?: string | null) {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}
export function normalizeFloor(s?: string | null) {
  return s?.trim() ?? null;
}
export function parseYear(s?: string | null) {
  const m = s?.match(/(19\d{2}|20\d{2})/);
  return m ? Number(m[1]) : null;
}
export function detectCurrency(s?: string | null): "EUR" | "RON" | "USD" | null {
  if (!s) return null;
  const up = s.toUpperCase();
  if (up.includes("€") || up.includes("EUR")) return "EUR";
  if (up.includes("RON") || up.includes("LEI")) return "RON";
  if (up.includes("$") || up.includes("USD")) return "USD";
  return null;
}
export function normalizeAddress(s?: string | null) {
  return s?.trim() ?? null;
}
export function preferLg(s?: string | null) {
  if (!s) return null;
  // dacă e srcset, ia ultima variantă
  if (s.includes(" ")) {
    const parts = s.split(",").map((p) => p.trim().split(" ")[0]);
    return parts[parts.length - 1] || s;
  }
  return s;
}
