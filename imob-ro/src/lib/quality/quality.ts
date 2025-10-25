export type PhotoMeta = { url?: string; width?: number; height?: number };
export type QualityInput = {
  extracted?: {
    title?: string | null;
    description?: string | null; // from sourceMeta if available
    photos?: PhotoMeta[] | any[] | null;
  };
  features?: {
    priceEur?: number | null;
    areaM2?: number | null;
    rooms?: number | null;
    yearBuilt?: number | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
  avm?: { mid?: number | null } | null;
};

export type QualityExplain = {
  photos: {
    count: number;
    goodRes: number;
    landscapeRatio: number;
    score: number;
    notes?: string[];
  };
  text: {
    titleLen: number;
    descLen: number;
    lexical: number;
    capsPct: number;
    spammy: number;
    score: number;
    notes?: string[];
  };
  completeness: { filled: string[]; missing: string[]; score: number };
  redflags: { flags: string[]; scorePenalty: number };
  aggregate: { score: number; badge: "Good" | "OK" | "Poor" };
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function scorePhotos(photos: any[] | null | undefined): QualityExplain["photos"] {
  const arr: PhotoMeta[] = Array.isArray(photos)
    ? photos.map((p: any) => ({ url: p?.url ?? p, width: p?.width, height: p?.height }))
    : [];
  const count = arr.length;
  const good = arr.filter((p) => (p.width ?? 0) >= 1024 && (p.height ?? 0) >= 768).length;
  const landscape = arr.filter((p) => (p.width ?? 0) >= (p.height ?? 0)).length;

  const goodRes = count ? Math.round((good / count) * 100) : 0;
  const landscapeRatio = count ? Math.round((landscape / count) * 100) : 0;

  // weights: count 40% (cap 12), resolution 40%, landscape 20%
  const sCount = clamp((count / 12) * 100, 0, 100);
  const score = Math.round(0.4 * sCount + 0.4 * goodRes + 0.2 * landscapeRatio);

  const notes: string[] = [];
  if (count < 6) notes.push("Prea puține fotografii (<6)");
  if (goodRes < 60) notes.push("Rezoluție scăzută la multe fotografii");
  if (landscapeRatio < 60) notes.push("Majoritatea fotografiilor nu sunt landscape");

  return { count, goodRes, landscapeRatio, score, notes };
}

function lexicalDiversity(s: string): number {
  const words = s
    .toLowerCase()
    .replace(/[^a-zăâîșț0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  const uniq = new Set(words);
  if (!words.length) return 0;
  return uniq.size / words.length; // 0..1
}

function spammyScore(s: string): number {
  const spam = ["URGENT", "!!!", "REDUCERE", "GARANTAT", "IMEDIAT", "BEST DEAL", "EXCLUSIVITATE"];
  const up = s.toUpperCase();
  let hit = 0;
  for (const k of spam) if (up.includes(k)) hit++;
  return clamp(hit / 3, 0, 1); // cap at 1
}

function scoreText(title?: string | null, desc?: string | null): QualityExplain["text"] {
  const t = (title ?? "").trim();
  const d = (desc ?? "").trim();
  const titleLen = t.length;
  const descLen = d.length;

  const capsPct = t ? Math.round((t.replace(/[^A-ZĂÂÎȘȚ]/g, "").length / t.length) * 100) : 0;
  const lex = lexicalDiversity(`${t} ${d}`);
  const spam = spammyScore(`${t} ${d}`);

  // title ideal 20–90, desc ideal 200–1200
  const sTitle = titleLen <= 0 ? 0 : titleLen < 20 ? 40 : titleLen > 120 ? 65 : 90;
  const sDesc = descLen <= 0 ? 0 : descLen < 150 ? 50 : descLen > 2000 ? 80 : 95;
  const sLex = clamp(((lex - 0.25) / (0.75 - 0.25)) * 100, 0, 100);
  const sCaps = clamp(100 - capsPct, 0, 100);
  const sSpam = clamp(100 - Math.round(spam * 100), 0, 100);

  const score = Math.round(0.25 * sTitle + 0.35 * sDesc + 0.2 * sLex + 0.1 * sCaps + 0.1 * sSpam);

  const notes: string[] = [];
  if (titleLen < 20) notes.push("Titlu prea scurt");
  if (descLen < 200) notes.push("Descriere prea scurtă");
  if (capsPct > 30) notes.push("Prea multe litere mari în titlu");
  if (spam > 0) notes.push("Expresii promo în text");

  return {
    titleLen,
    descLen,
    lexical: Number(lex.toFixed(2)),
    capsPct,
    spammy: Math.round(spam * 100),
    score,
    notes,
  };
}

function scoreCompleteness(f?: QualityInput["features"]): QualityExplain["completeness"] {
  const required = ["priceEur", "areaM2", "rooms", "yearBuilt", "lat", "lng"];
  const filled: string[] = [];
  const missing: string[] = [];
  for (const k of required) {
    const v = (f as any)?.[k];
    (v == null ? missing : filled).push(k);
  }
  return { filled, missing, score: Math.round((filled.length / required.length) * 100) };
}

function redFlags(
  f: QualityInput["features"],
  avm: { mid?: number | null } | undefined,
  photos: QualityExplain["photos"],
  text: QualityExplain["text"],
) {
  const flags: string[] = [];
  const price = f?.priceEur ?? null;
  const avmMid = avm?.mid ?? null;
  if (price != null && avmMid != null) {
    const delta = (price - avmMid) / avmMid;
    if (delta <= -0.35) flags.push("Preț mult sub estimarea pieței");
    if (delta >= 0.5) flags.push("Preț mult peste estimarea pieței");
  }
  const area = f?.areaM2 ?? null;
  const rooms = f?.rooms ?? null;
  if (area && rooms && area / rooms < 14) flags.push("M² per cameră neobișnuit de mic");
  if (photos.count <= 3) flags.push("Prea puține fotografii");
  if (text.descLen < 80) flags.push("Descriere extrem de scurtă");

  const scorePenalty = clamp(flags.length * 3, 0, 15);
  return { flags, scorePenalty };
}

export function computeQuality(input: QualityInput): QualityExplain {
  const photos = scorePhotos(input.extracted?.photos ?? null);
  const text = scoreText(input.extracted?.title ?? "", input.extracted?.description ?? "");
  const completeness = scoreCompleteness(input.features);

  const prelim = 0.35 * photos.score + 0.35 * text.score + 0.3 * completeness.score;
  const rf = redFlags(input.features ?? null, input.avm ?? undefined, photos, text);
  const score = Math.round(clamp(prelim - rf.scorePenalty, 0, 100));
  const badge = score >= 75 ? "Good" : score >= 55 ? "OK" : "Poor";

  return { photos, text, completeness, redflags: rf, aggregate: { score, badge } };
}
