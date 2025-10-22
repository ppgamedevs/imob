// Trigram-based text similarity for fuzzy matching
export function trigram(s: string) {
  const T = new Set<string>();
  const x = `  ${s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")}  `;
  for (let i = 0; i < x.length - 2; i++) T.add(x.slice(i, i + 3));
  return T;
}

export function jaccard(a: string, b: string) {
  if (!a || !b) return 0;
  const A = trigram(a),
    B = trigram(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

// Canonical signature for deterministic grouping
export function canonicalSignature(input: {
  lat?: number | null;
  lng?: number | null;
  areaM2?: number | null;
  priceEur?: number | null;
  level?: number | null;
  yearBuilt?: number | null;
}) {
  const lat = input.lat != null ? Math.round(input.lat * 1e4) / 1e4 : null; // ~11 m precision
  const lng = input.lng != null ? Math.round(input.lng * 1e4) / 1e4 : null;
  const a = input.areaM2 != null ? Math.round(input.areaM2) : null;
  const band = input.priceEur != null ? Math.round(input.priceEur / 1000) : null; // thousands €
  const lvl = input.level != null ? input.level : null;
  const y = input.yearBuilt != null ? input.yearBuilt : null;
  if (lat == null || lng == null || a == null || band == null) return null;
  return `geo:${lat},${lng}|m2:${a}|k:${band}|L:${lvl ?? "-"}|Y:${y ?? "-"}`;
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000,
    toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1),
    dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Composite fuzzy score for identifying same property across sources
/* eslint-disable @typescript-eslint/no-explicit-any */
export function fuzzyScore(a: any, b: any) {
  // Weighted: title 25%, geo 25%, photo 20%, contact 15%, area 10%, price 5%
  let s = 0;
  const reasons: any = {};

  // Title/address similarity
  const ta = (a.extracted?.title || a.features?.features?.addressRaw || "") as string;
  const tb = (b.extracted?.title || b.features?.features?.addressRaw || "") as string;
  const ts = jaccard(ta, tb);
  if (ts > 0) {
    s += ts * 0.25;
    reasons.title = ts;
  }

  // Geographic proximity
  const la = a.features?.features?.lat,
    loa = a.features?.features?.lng;
  const lb = b.features?.features?.lat,
    lob = b.features?.features?.lng;
  if (la != null && lb != null && loa != null && lob != null) {
    const d = distanceM(la, loa, lb, lob);
    const gs = d <= 60 ? 1 : d <= 120 ? 0.6 : d <= 250 ? 0.3 : 0;
    s += gs * 0.25;
    reasons.geo = { meters: Math.round(d), score: gs };
  }

  // Photo similarity (pHash matching)
  const photosA = a.photos || [];
  const photosB = b.photos || [];
  if (photosA.length > 0 && photosB.length > 0) {
    const hashesA = photosA.map((p: any) => p.phash).filter(Boolean);
    const hashesB = photosB.map((p: any) => p.phash).filter(Boolean);
    if (hashesA.length > 0 && hashesB.length > 0) {
      // Count matching hashes
      const matches = hashesA.filter((h: string) => hashesB.includes(h)).length;
      const maxPossible = Math.min(hashesA.length, hashesB.length);
      const photoScore = matches / maxPossible;
      s += photoScore * 0.2;
      reasons.photo = { matches, total: maxPossible, score: photoScore };
    }
  }

  // Contact similarity (phone/email)
  const contactA = a.sight?.contact || a.extracted?.sourceMeta?.contact || null;
  const contactB = b.sight?.contact || b.extracted?.sourceMeta?.contact || null;
  if (contactA && contactB) {
    // Normalize: remove spaces, dashes, parentheses from phone numbers
    const normA = contactA.replace(/[\s\-()]/g, "").toLowerCase();
    const normB = contactB.replace(/[\s\-()]/g, "").toLowerCase();
    if (normA === normB) {
      s += 1 * 0.15;
      reasons.contact = { match: true, score: 1 };
    } else if (normA.includes(normB) || normB.includes(normA)) {
      // Partial match (one contains the other)
      s += 0.5 * 0.15;
      reasons.contact = { match: "partial", score: 0.5 };
    }
  }

  // Area m² similarity
  const ma = a.features?.features?.areaM2,
    mb = b.features?.features?.areaM2;
  if (ma && mb) {
    const rel = Math.abs(ma - mb) / Math.max(ma, mb);
    const ms = rel <= 0.05 ? 1 : rel <= 0.1 ? 0.5 : 0;
    s += ms * 0.1;
    reasons.area = { rel, score: ms };
  }

  // Price similarity
  const pa = a.features?.features?.priceEur,
    pb = b.features?.features?.priceEur;
  if (pa && pb) {
    const rel = Math.abs(pa - pb) / Math.max(pa, pb);
    const ps = rel <= 0.07 ? 1 : rel <= 0.12 ? 0.5 : 0;
    s += ps * 0.05;
    reasons.price = { rel, score: ps };
  }

  return { score: s, reasons };
}
