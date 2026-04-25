import { Prisma } from "@prisma/client";

import { hostnameKey } from "@/lib/admin/money-dashboard";
import { prisma } from "@/lib/db";

const FAIL_STATUSES: string[] = ["error", "failed", "rejected_rental", "rejected_not_realestate"];

const EXTRACTION_ERROR_CODES = ["extraction_failed", "fetch_timeout_blocked"] as const;

export type WindowQuality = {
  high: number;
  medium: number;
  low: number;
  unknown: number;
  comps0: number;
  comps1to2: number;
  comps3plus: number;
};

export type DataQualityTimeMetrics = {
  analysesStartedFunnel: number;
  /** Creări rând Analysis în fereastră (raport cu coadă) */
  analysesCreated: number;
  analysesDone: number;
  analysesFailedTerminal: number;
  /** status error sau câmp error legat de extragere / fetch */
  extractionFailed: number;
  /** analysis_failed din funnel, distinct analysisId (dacă există) */
  analysisFailedFunnel: number;
  missingPrice: number;
  missingArea: number;
  missingRooms: number;
  missingLocation: number;
  quality: WindowQuality;
};

export type DataQualityByHost = {
  host: string;
  nTotal: number;
  nDone: number;
  nFailed: number;
  successRate: number;
  failureRate: number;
  avgComps: number | null;
  pctMissingPrice: number;
  pctMissingArea: number;
};

export type PaidReportRisk = {
  paidWithLowConfidence: number;
  paidWithZeroComps: number;
  paidMissingLocation: number;
};

export type WeakReportRow = {
  analysisId: string;
  sourceUrl: string;
  host: string;
  missingFields: string[];
  compCount: number;
  confidence: string;
  isPaid: boolean;
};

/**
 * Fereastră glisantă: [from, to] (inclusiv, typical `to` = now).
 * Metricile „done” / „raport” folosesc `Analysis.updatedAt` (când a ajuns la stadiul final pe rând).
 * Metricile „început” folosesc funnel `analysis_started` sau `createdAt` pe Analysis.
 */
export async function getDataQualityForWindow(
  from: Date,
  to: Date,
): Promise<DataQualityTimeMetrics> {
  const emptyQ = (): WindowQuality => ({
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
    comps0: 0,
    comps1to2: 0,
    comps3plus: 0,
  });

  const [
    startedRows,
    created,
    done,
    failed,
    extractFail,
    funnelFail,
    missPrice,
    missArea,
    missRooms,
    missLoc,
    q,
  ] = await Promise.all([
    distinctFunnelAnalyses("analysis_started", from, to),
    prisma.analysis.count({ where: { createdAt: { gte: from, lte: to } } }).catch(() => 0),
    prisma.analysis
      .count({ where: { status: "done", updatedAt: { gte: from, lte: to } } })
      .catch(() => 0),
    prisma.analysis
      .count({ where: { status: { in: FAIL_STATUSES }, updatedAt: { gte: from, lte: to } } })
      .catch(() => 0),
    countExtractionFailed(from, to),
    distinctFunnelAnalyses("analysis_failed", from, to),
    countMissingFieldDone(from, to, "price"),
    countMissingFieldDone(from, to, "area"),
    countMissingFieldDone(from, to, "rooms"),
    countMissingLocationDone(from, to),
    qualityForDoneWindow(from, to),
  ]);

  return {
    analysesStartedFunnel: startedRows,
    analysesCreated: created,
    analysesDone: done,
    analysesFailedTerminal: failed,
    extractionFailed: extractFail,
    analysisFailedFunnel: funnelFail,
    missingPrice: missPrice,
    missingArea: missArea,
    missingRooms: missRooms,
    missingLocation: missLoc,
    quality: q ?? emptyQ(),
  };
}

async function distinctFunnelAnalyses(eventName: string, from: Date, to: Date): Promise<number> {
  try {
    const r = await prisma.funnelEvent.findMany({
      where: { eventName, createdAt: { gte: from, lte: to }, analysisId: { not: null } },
      select: { analysisId: true },
      distinct: ["analysisId"],
    });
    return r.length;
  } catch {
    return 0;
  }
}

async function countExtractionFailed(from: Date, to: Date): Promise<number> {
  try {
    return await prisma.analysis.count({
      where: {
        updatedAt: { gte: from, lte: to },
        OR: [{ status: "error" }, { error: { in: [...EXTRACTION_ERROR_CODES] } }],
      },
    });
  } catch {
    return 0;
  }
}

async function countMissingFieldDone(
  from: Date,
  to: Date,
  field: "price" | "area" | "rooms",
): Promise<number> {
  try {
    if (field === "price") {
      return await prisma.extractedListing.count({
        where: {
          OR: [{ price: null }, { price: { lte: 0 } }],
          analysis: { status: "done", updatedAt: { gte: from, lte: to } },
        },
      });
    }
    if (field === "area") {
      return await prisma.extractedListing.count({
        where: {
          areaM2: null,
          titleAreaM2: null,
          analysis: { status: "done", updatedAt: { gte: from, lte: to } },
        },
      });
    }
    return await prisma.extractedListing.count({
      where: {
        rooms: null,
        analysis: { status: "done", updatedAt: { gte: from, lte: to } },
      },
    });
  } catch {
    return 0;
  }
}

/** Fără pereche GPS completă: lipsește lat sau lipsește lng. */
async function countMissingLocationDone(from: Date, to: Date): Promise<number> {
  try {
    return await prisma.extractedListing.count({
      where: {
        OR: [{ lat: null }, { lng: null }],
        analysis: { status: "done", updatedAt: { gte: from, lte: to } },
      },
    });
  } catch {
    return 0;
  }
}

async function qualityForDoneWindow(from: Date, to: Date): Promise<WindowQuality | null> {
  const empty: WindowQuality = {
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
    comps0: 0,
    comps1to2: 0,
    comps3plus: 0,
  };
  try {
    const confRows = await prisma.$queryRaw<{ lvl: string | null; c: bigint }[]>(Prisma.sql`
      SELECT
        COALESCE(s.explain->'confidence'->>'level', 'unknown') AS lvl,
        COUNT(*)::bigint AS c
      FROM "Analysis" a
      INNER JOIN "ScoreSnapshot" s ON s."analysisId" = a.id
      WHERE a.status = 'done'
        AND a."updatedAt" >= ${from}
        AND a."updatedAt" <= ${to}
      GROUP BY 1
    `);
    for (const r of confRows) {
      const k = (r.lvl || "unknown").toLowerCase();
      const n = Number(r.c);
      if (k === "high") empty.high = n;
      else if (k === "medium") empty.medium = n;
      else if (k === "low") empty.low = n;
      else empty.unknown += n;
    }
  } catch {
    return null;
  }
  try {
    const compRows = await prisma.$queryRaw<{ bucket: string; c: bigint }[]>(Prisma.sql`
      WITH cnt AS (
        SELECT a.id AS aid, COALESCE(COUNT(cm.id), 0)::int AS n
        FROM "Analysis" a
        LEFT JOIN "CompMatch" cm ON cm."analysisId" = a.id
        WHERE a.status = 'done'
          AND a."updatedAt" >= ${from}
          AND a."updatedAt" <= ${to}
        GROUP BY a.id
      )
      SELECT
        CASE
          WHEN n = 0 THEN '0'
          WHEN n IN (1, 2) THEN '12'
          ELSE '3+'
        END AS bucket,
        COUNT(*)::bigint AS c
      FROM cnt
      GROUP BY 1
    `);
    for (const r of compRows) {
      const n = Number(r.c);
      if (r.bucket === "0") empty.comps0 = n;
      else if (r.bucket === "12") empty.comps1to2 = n;
      else empty.comps3plus = n;
    }
  } catch {
    return empty;
  }
  return empty;
}

/**
 * Rânduri per host, `createdAt` analize în fereastră (flux nou).
 * Rată succes = nDone / nTotal, rată eșec = nFailed / nTotal.
 */
export async function getDataQualityByHost(from: Date, to: Date): Promise<DataQualityByHost[]> {
  const rows = await prisma.analysis
    .findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        sourceUrl: true,
        status: true,
        extractedListing: {
          select: { price: true, areaM2: true, titleAreaM2: true },
        },
        _count: { select: { compMatches: true } },
      },
      take: 25_000,
    })
    .catch(() => []);

  type Agg = {
    nTotal: number;
    nDone: number;
    nFailed: number;
    missingPrice: number;
    missingArea: number;
    compSum: number;
  };
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const h = hostnameKey(r.sourceUrl);
    let a = map.get(h);
    if (!a) {
      a = { nTotal: 0, nDone: 0, nFailed: 0, missingPrice: 0, missingArea: 0, compSum: 0 };
      map.set(h, a);
    }
    a.nTotal += 1;
    if (r.status === "done") {
      a.nDone += 1;
      const el = r.extractedListing;
      const noPrice = !el?.price || el.price <= 0;
      const noArea = el?.areaM2 == null && el?.titleAreaM2 == null;
      if (noPrice) a.missingPrice += 1;
      if (noArea) a.missingArea += 1;
      a.compSum += r._count?.compMatches ?? 0;
    } else if (FAIL_STATUSES.includes(r.status)) {
      a.nFailed += 1;
    }
  }

  const out: DataQualityByHost[] = [];
  for (const [host, a] of map) {
    const nT = a.nTotal;
    const nDone = a.nDone;
    const nFailed = a.nFailed;
    const successRate = nT > 0 ? nDone / nT : 0;
    const failureRate = nT > 0 ? nFailed / nT : 0;
    const avgComps = nDone > 0 ? a.compSum / nDone : null;
    const pctMissingPrice = nDone > 0 ? (a.missingPrice / nDone) * 100 : 0;
    const pctMissingArea = nDone > 0 ? (a.missingArea / nDone) * 100 : 0;
    out.push({
      host,
      nTotal: nT,
      nDone,
      nFailed,
      successRate,
      failureRate,
      avgComps,
      pctMissingPrice,
      pctMissingArea,
    });
  }
  out.sort((a, b) => b.nTotal - a.nTotal);
  return out;
}

export async function getPaidReportRisk(): Promise<PaidReportRisk> {
  const base = {
    where: { status: "paid" as const },
    select: { analysisId: true },
  };
  const paidIds = await prisma.reportUnlock.findMany(base).catch(() => []);
  const unique = [...new Set(paidIds.map((p) => p.analysisId))];
  if (unique.length === 0) {
    return { paidWithLowConfidence: 0, paidWithZeroComps: 0, paidMissingLocation: 0 };
  }

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const batches = chunk(unique, 2000);
  const analyses: {
    id: string;
    extractedListing: { lat: number | null; lng: number | null } | null;
    scoreSnapshot: { explain: unknown } | null;
  }[] = [];
  const compParts: { analysisId: string; _count: { _all: number } }[] = [];

  for (const ids of batches) {
    const [a, c] = await Promise.all([
      prisma.analysis.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          extractedListing: { select: { lat: true, lng: true } },
          scoreSnapshot: { select: { explain: true } },
        },
      }),
      prisma.compMatch
        .groupBy({
          by: ["analysisId"],
          _count: { _all: true },
          where: { analysisId: { in: ids } },
        })
        .catch(() => []),
    ]);
    analyses.push(...a);
    compParts.push(...c);
  }

  const cc = new Map<string, number>();
  for (const c of compParts) {
    cc.set(c.analysisId, c._count._all);
  }

  let paidWithLowConfidence = 0;
  let paidWithZeroComps = 0;
  let paidMissingLocation = 0;

  const seenLow = new Set<string>();
  const seenZero = new Set<string>();
  const seenLoc = new Set<string>();

  for (const a of analyses) {
    const ex = a.extractedListing;
    const expl = a.scoreSnapshot?.explain as Record<string, unknown> | null | undefined;
    const conf = (expl?.confidence as { level?: string } | undefined)?.level?.toLowerCase();
    if (conf === "low" && !seenLow.has(a.id)) {
      seenLow.add(a.id);
      paidWithLowConfidence += 1;
    }
    const n = cc.get(a.id) ?? 0;
    if (n === 0 && !seenZero.has(a.id)) {
      seenZero.add(a.id);
      paidWithZeroComps += 1;
    }
    const noGpsPair = ex?.lat == null || ex?.lng == null;
    if (noGpsPair && !seenLoc.has(a.id)) {
      seenLoc.add(a.id);
      paidMissingLocation += 1;
    }
  }

  return { paidWithLowConfidence, paidWithZeroComps, paidMissingLocation };
}

export async function getWeakRecentReports(limit: number): Promise<WeakReportRow[]> {
  const t30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [done, paidRows] = await Promise.all([
    prisma.analysis
      .findMany({
        where: { status: "done", updatedAt: { gte: t30d, lte: now } },
        orderBy: { updatedAt: "desc" },
        take: 800,
        select: {
          id: true,
          sourceUrl: true,
          extractedListing: {
            select: {
              price: true,
              areaM2: true,
              titleAreaM2: true,
              rooms: true,
              lat: true,
              lng: true,
            },
          },
          scoreSnapshot: { select: { explain: true } },
          _count: { select: { compMatches: true } },
        },
      })
      .catch(() => []),
    prisma.reportUnlock
      .findMany({ where: { status: "paid" }, select: { analysisId: true } })
      .catch(() => []),
  ]);

  const paidSet = new Set(paidRows.map((p) => p.analysisId));

  const weak: WeakReportRow[] = [];
  for (const a of done) {
    const el = a.extractedListing;
    const compCount = a._count?.compMatches ?? 0;
    const expl = a.scoreSnapshot?.explain as Record<string, unknown> | null | undefined;
    const level = (
      (expl?.confidence as { level?: string } | undefined)?.level ?? "unknown"
    ).toLowerCase();
    const miss: string[] = [];
    if (!el?.price || el.price <= 0) miss.push("preț");
    if (el?.areaM2 == null && el?.titleAreaM2 == null) miss.push("suprafață");
    if (el?.rooms == null) miss.push("camere");
    if (el?.lat == null || el?.lng == null) miss.push("localizare (GPS)");
    const isWeak =
      level === "low" ||
      compCount === 0 ||
      el?.lat == null ||
      el?.lng == null ||
      !el?.price ||
      el.price <= 0 ||
      (el?.areaM2 == null && el?.titleAreaM2 == null);
    if (!isWeak) continue;

    weak.push({
      analysisId: a.id,
      sourceUrl: a.sourceUrl,
      host: hostnameKey(a.sourceUrl),
      missingFields: miss,
      compCount,
      confidence: level,
      isPaid: paidSet.has(a.id),
    });
    if (weak.length >= limit) break;
  }
  return weak;
}

/**
 * Rezumat: ultimele 24 h + 7 zile + host 7d + risc plătit + tabel slab.
 */
export async function getDataQualityDashboard() {
  const now = new Date();
  const t24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const t7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [h24, d7, host7, host24, paidRisk, weak] = await Promise.all([
    getDataQualityForWindow(t24h, now),
    getDataQualityForWindow(t7d, now),
    getDataQualityByHost(t7d, now),
    getDataQualityByHost(t24h, now),
    getPaidReportRisk(),
    getWeakRecentReports(40),
  ]);

  return {
    nowIso: now.toISOString(),
    t24hIso: t24h.toISOString(),
    t7dIso: t7d.toISOString(),
    last24h: h24,
    last7d: d7,
    byHost7d: host7,
    byHost24h: host24,
    paidRisk,
    weakReports: weak,
  };
}
