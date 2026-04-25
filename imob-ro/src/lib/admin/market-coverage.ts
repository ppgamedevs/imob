import type { ExtractedListing } from "@prisma/client";

import { prisma } from "@/lib/db";
import { detectPropertyType, type PropertyType, sanitizeRooms } from "@/lib/property-type";
import { resolveActualPriceEur } from "@/lib/report/report-commercial-signals";
import type { NormalizedFeatures } from "@/lib/types/pipeline";

const APARTMENT_COVERAGE: Set<PropertyType> = new Set([
  "apartament",
  "garsoniera",
  "studio",
  "mansarda",
  "penthouse",
  "duplex",
]);

const MARKET_COVERAGE_DAYS = 180;
const MAX_RAW_ROWS = 100_000;
const MAX_BUCKETS_SHOWN = 1_500;

export type MarketCoverageRegionFilter = "all" | "bucuresti" | "ilfov";

export type MarketCoverageStatus = "strong" | "usable" | "weak" | "insufficient";

export type MarketCoverageFilters = {
  region: MarketCoverageRegionFilter;
  /** '' or '1'–'6' (sector București) */
  sector: string;
  /** '' or '1' | '2' | '3' | '4+' */
  rooms: string;
  host: string;
};

export type MarketCoverageRow = {
  city: string;
  sector: string;
  neighborhood: string;
  rooms: string;
  areaBucket: string;
  recency: string;
  totalListings: number;
  withValidPrice: number;
  withValidArea: number;
  withValidRooms: number;
  withLatLng: number;
  withAvm: number;
  withAtLeastOneComp: number;
  medianEurM2: number | null;
  p25EurM2: number | null;
  p75EurM2: number | null;
  uniqueHosts: number;
  /** Share of rows (with hash) that share a `contentHash` with another row in the bucket. */
  duplicateRatio: number | null;
  status: MarketCoverageStatus;
};

export type MarketCoverageSummary = {
  strong: number;
  usable: number;
  weak: number;
  insufficient: number;
  totalBuckets: number;
  rawListingsInWindow: number;
  /** Listări apartament (tip) în fereastră, înainte de filtre admin. */
  afterApartmentFilter: number;
  /** Listări incluse în agregare după toate filtrele (1 listare = 1 rând contorizat). */
  listingRowsAfterFilters: number;
  truncated: boolean;
};

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildLocationT(
  features: Record<string, unknown>,
  addressRaw: string | null | undefined,
): string {
  const city = (features.city as string | undefined) ?? "";
  const slug = (features.areaSlug as string | undefined) ?? "";
  const addr = (features.addressRaw as string | undefined) ?? addressRaw ?? "";
  return normalizeText(`${city} ${slug} ${addr}`);
}

/**
 * Heuristic: București core vs Ilfov (fără dublu-count cu același text ca isBucharestIlfov combinat).
 */
function subregionFromFeatures(
  features: Record<string, unknown>,
  addressRaw: string | null | undefined,
): "bucuresti" | "ilfov" | "other" {
  const t = buildLocationT(features, addressRaw);
  if (t.includes("bucuresti") || t.includes("bucharest")) return "bucuresti";
  if (
    t.includes("ilfov") ||
    t.includes("voluntari") ||
    t.includes("chitila") ||
    t.includes("otopeni") ||
    t.includes("bragadiru") ||
    t.includes("popesti") ||
    t.includes("magurele") ||
    t.includes("chiajna")
  ) {
    return "ilfov";
  }
  if (/(^|\s)sector(\s+|-)?[1-6](\b|\s|\.)/.test(t)) return "bucuresti";
  return "other";
}

function parseSectorKey(features: Record<string, unknown>): string {
  const raw = (features as { sector?: unknown }).sector;
  if (typeof raw === "number" && raw >= 1 && raw <= 6) return String(raw);
  if (typeof raw === "string" && /^[1-6]$/.test(raw.trim())) return raw.trim();
  const slug = ((features.areaSlug as string) ?? "").toLowerCase();
  const m = slug.match(/(?:^|-)sector[_-]?([1-6])\b|bucuresti[_-]sector[_-]([1-6])/i);
  if (m) return m[1] || m[2] || "";
  return "";
}

function areaM2FromRow(
  ex: { areaM2: number | null } | null,
  f: Record<string, unknown>,
): number | null {
  const a = (ex?.areaM2 as number | undefined) ?? (f.areaM2 as number | null | undefined);
  if (a == null) return null;
  const n = Number(a);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function areaBucket(m2: number | null): string {
  if (m2 == null) return "necunoscut";
  if (m2 < 40) return "< 40 m²";
  if (m2 < 55) return "40–54 m²";
  if (m2 < 70) return "55–69 m²";
  if (m2 < 90) return "70–89 m²";
  return "90+ m²";
}

function recencyLabel(createdAt: Date): "0–30 zile" | "31–90 zile" | "91–180 zile" {
  const days = (Date.now() - createdAt.getTime()) / 86_400_000;
  if (days <= 30) return "0–30 zile";
  if (days <= 90) return "31–90 zile";
  return "91–180 zile";
}

function roomsLabel(sane: number | null): string {
  if (sane == null || !Number.isFinite(sane) || sane < 1) return "—";
  if (sane >= 4) return "4+";
  return String(sane);
}

function quantileSorted(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! * (hi - pos) + sorted[hi]! * (pos - lo);
}

function hostFromSourceUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "(invalid-url)";
  }
}

function statusFromCount(n: number): MarketCoverageStatus {
  if (n >= 100) return "strong";
  if (n >= 30) return "usable";
  if (n >= 10) return "weak";
  return "insufficient";
}

type Agg = {
  key: string;
  city: string;
  sector: string;
  neighborhood: string;
  rooms: string;
  areaBucket: string;
  recency: string;
  total: number;
  withValidPrice: number;
  withValidArea: number;
  withValidRooms: number;
  withLatLng: number;
  withAvm: number;
  withAtLeastOneComp: number;
  eurM2: number[];
  hosts: Set<string>;
  hashes: string[];
  uniqueHashes: Set<string>;
};

function makeKey(parts: string[]): string {
  return parts.join("‖");
}

export async function getMarketCoverageData(filters: MarketCoverageFilters): Promise<{
  rows: MarketCoverageRow[];
  summary: MarketCoverageSummary;
  hostOptions: { host: string; count: number }[];
}> {
  const since = new Date(Date.now() - MARKET_COVERAGE_DAYS * 86_400_000);
  const raw = await prisma.analysis.findMany({
    where: {
      status: "done",
      createdAt: { gte: since },
      extractedListing: { isNot: null },
      featureSnapshot: { isNot: null },
    },
    take: MAX_RAW_ROWS,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceUrl: true,
      contentHash: true,
      createdAt: true,
      extractedListing: {
        select: {
          title: true,
          price: true,
          currency: true,
          areaM2: true,
          rooms: true,
          addressRaw: true,
          lat: true,
          lng: true,
        },
      },
      featureSnapshot: { select: { features: true } },
      scoreSnapshot: { select: { avmMid: true } },
      _count: { select: { compMatches: true } },
    },
  });

  const truncated = raw.length >= MAX_RAW_ROWS;
  const sectorFilter = filters.sector.trim();
  const roomsFilter = filters.rooms.trim();
  const hostSub = filters.host.trim().toLowerCase();

  const perHost = new Map<string, number>();
  const aggs = new Map<string, Agg>();
  let afterApt = 0;
  let listingRowsAfterFilters = 0;

  for (const a of raw) {
    const ex = a.extractedListing;
    if (!ex) continue;
    const f = a.featureSnapshot?.features as Record<string, unknown> | null;
    if (!f) continue;

    const nf = f as NormalizedFeatures;
    const title = (ex.title ?? (f.title as string | null | undefined) ?? null) as string | null;
    const pt = detectPropertyType(
      title,
      ex.rooms ?? (f.rooms as number | null | undefined) ?? null,
    );
    if (!APARTMENT_COVERAGE.has(pt)) continue;
    afterApt++;

    const sub = subregionFromFeatures(f, ex.addressRaw);
    if (filters.region === "bucuresti" && sub !== "bucuresti") continue;
    if (filters.region === "ilfov" && sub !== "ilfov") continue;

    const host = hostFromSourceUrl(a.sourceUrl);
    if (hostSub && !host.toLowerCase().includes(hostSub)) continue;

    const sk = parseSectorKey(f);
    if (sectorFilter && sk !== sectorFilter) continue;

    const sane = sanitizeRooms((ex.rooms ?? f.rooms) as number | null | undefined, ex.title);
    const rm = roomsLabel(sane);
    if (roomsFilter && rm !== roomsFilter) continue;

    perHost.set(host, (perHost.get(host) ?? 0) + 1);

    const city = ((f.city as string) ?? "—").trim() || "—";
    const neighborhood = ((f.areaSlug as string) ?? "—").trim() || "—";
    const sectorDisp = sk ? `S${sk}` : "—";
    const m2 = areaM2FromRow(ex, f);
    const ab = areaBucket(m2);
    const rec = recencyLabel(a.createdAt);

    const key = makeKey([city, sectorDisp, neighborhood, rm, ab, rec]);

    let g = aggs.get(key);
    if (!g) {
      g = {
        key,
        city,
        sector: sectorDisp,
        neighborhood,
        rooms: rm,
        areaBucket: ab,
        recency: rec,
        total: 0,
        withValidPrice: 0,
        withValidArea: 0,
        withValidRooms: 0,
        withLatLng: 0,
        withAvm: 0,
        withAtLeastOneComp: 0,
        eurM2: [],
        hosts: new Set(),
        hashes: [],
        uniqueHashes: new Set(),
      };
      aggs.set(key, g);
    }

    g.total += 1;
    listingRowsAfterFilters += 1;
    g.hosts.add(host);

    const priceEur = resolveActualPriceEur(ex as unknown as ExtractedListing, nf);
    if (priceEur != null) g.withValidPrice += 1;

    if (m2 != null) g.withValidArea += 1;
    if (sane != null) g.withValidRooms += 1;

    const latN = (ex.lat ?? f.lat) as number | null | undefined;
    const lngN = (ex.lng ?? f.lng) as number | null | undefined;
    if (latN != null && lngN != null && Number.isFinite(latN) && Number.isFinite(lngN)) {
      g.withLatLng += 1;
    }
    if (a.scoreSnapshot?.avmMid != null && Number.isFinite(a.scoreSnapshot.avmMid)) g.withAvm += 1;
    if (a._count.compMatches > 0) g.withAtLeastOneComp += 1;

    if (priceEur != null && m2 != null && m2 > 0) {
      g.eurM2.push(priceEur / m2);
    }

    if (a.contentHash && a.contentHash.length > 0) {
      g.hashes.push(a.contentHash);
      g.uniqueHashes.add(a.contentHash);
    }
  }

  const hostOptions = Array.from(perHost.entries())
    .map(([h, c]) => ({ host: h, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const rowsFull: MarketCoverageRow[] = [];
  let strong = 0;
  let usable = 0;
  let weak = 0;
  let insufficient = 0;

  for (const g of aggs.values()) {
    g.eurM2.sort((x, y) => x - y);
    const st = statusFromCount(g.total);
    if (st === "strong") strong += 1;
    else if (st === "usable") usable += 1;
    else if (st === "weak") weak += 1;
    else insufficient += 1;

    let duplicateRatio: number | null = null;
    if (g.hashes.length > 0) {
      const unique = g.uniqueHashes.size;
      duplicateRatio = Math.max(0, Math.min(1, 1 - unique / g.hashes.length));
    }

    rowsFull.push({
      city: g.city,
      sector: g.sector,
      neighborhood: g.neighborhood,
      rooms: g.rooms,
      areaBucket: g.areaBucket,
      recency: g.recency,
      totalListings: g.total,
      withValidPrice: g.withValidPrice,
      withValidArea: g.withValidArea,
      withValidRooms: g.withValidRooms,
      withLatLng: g.withLatLng,
      withAvm: g.withAvm,
      withAtLeastOneComp: g.withAtLeastOneComp,
      medianEurM2: quantileSorted(g.eurM2, 0.5),
      p25EurM2: quantileSorted(g.eurM2, 0.25),
      p75EurM2: quantileSorted(g.eurM2, 0.75),
      uniqueHosts: g.hosts.size,
      duplicateRatio,
      status: st,
    });
  }

  rowsFull.sort((a, b) => b.totalListings - a.totalListings);
  const rows = rowsFull.slice(0, MAX_BUCKETS_SHOWN);

  return {
    rows,
    summary: {
      strong,
      usable,
      weak,
      insufficient,
      totalBuckets: aggs.size,
      rawListingsInWindow: raw.length,
      afterApartmentFilter: afterApt,
      listingRowsAfterFilters,
      truncated,
    },
    hostOptions,
  };
}

export { MARKET_COVERAGE_DAYS, MAX_BUCKETS_SHOWN, MAX_RAW_ROWS };
