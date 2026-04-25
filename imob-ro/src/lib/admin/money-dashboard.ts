import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type FunnelOrPlaceholder = { value: number; available: true } | { value: null; available: false };

function fp(n: number | null, ok: boolean): FunnelOrPlaceholder {
  if (!ok) return { value: null, available: false };
  return { value: n ?? 0, available: true };
}

/** Start of UTC calendar day. */
export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/** Rolling window from (now - 7d). */
export function last7dStart(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export type MoneyTimeMetrics = {
  reportsGenerated: number;
  previewViews: FunnelOrPlaceholder;
  unlockCtaClicks: FunnelOrPlaceholder;
  checkoutStarts: FunnelOrPlaceholder;
  paidUnlocks: number;
  revenueRon: number;
  pdfDownloads: FunnelOrPlaceholder;
};

export type FailureBucket = {
  key: string;
  label: string;
  count: number;
};

export type SourceRow = { label: string; count: number };

export type QualityCounts = {
  high: number;
  medium: number;
  low: number;
  unknown: number;
  comps0: number;
  comps1to2: number;
  comps3plus: number;
};

export type MoneyDashboardData = {
  now: string;
  todayStartUtc: string;
  last7dStart: string;
  today: MoneyTimeMetrics;
  last7d: MoneyTimeMetrics;
  conversion: {
    previewAnalyses7d: number;
    paidAnalyses7d: number;
    both7d: number;
    previewToPaidRate: string;
    avgRevenueRonPerPreviewAnalysis: string;
  };
  quality7d: QualityCounts;
  missingPrice7d: number;
  missingArea7d: number;
  source7d: SourceRow[];
  failure7d: { buckets: FailureBucket[]; funnelFailuresAvailable: boolean };
};

function ron(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

async function funnelCount(
  eventName: string,
  gte: Date,
  lte: Date = new Date(),
): Promise<{ count: number; ok: boolean }> {
  try {
    const count = await prisma.funnelEvent.count({
      where: { eventName, createdAt: { gte, lte: lte } },
    });
    return { count, ok: true };
  } catch {
    return { count: 0, ok: false };
  }
}

/**
 * Today + last 7d business metrics, quality, sources, and missing field counts (7d, done reports only).
 * Does not include merged failure table (use getMoneyDashboard).
 */
export async function getMoneyDashTodayAnd7d(
  tTodayStart: Date = startOfUtcDay(),
  t7d: Date = last7dStart(),
  now: Date = new Date(),
): Promise<{
  today: MoneyTimeMetrics;
  last7d: MoneyTimeMetrics;
  conversion: MoneyDashboardData["conversion"];
  quality7d: QualityCounts;
  missingPrice7d: number;
  missingArea7d: number;
  source7d: SourceRow[];
}> {
  const [
    reportsToday,
    reports7d,
    previewT,
    prev7,
    ctaT,
    cta7,
    coT,
    co7,
    pdfT,
    pdf7,
    paidT,
    paid7,
    sumCentsToday,
    sumCents7d,
  ] = await Promise.all([
    prisma.analysis.count({ where: { status: "done", updatedAt: { gte: tTodayStart, lte: now } } }),
    prisma.analysis.count({ where: { status: "done", updatedAt: { gte: t7d, lte: now } } }),
    funnelCount("report_preview_viewed", tTodayStart, now),
    funnelCount("report_preview_viewed", t7d, now),
    funnelCount("unlock_cta_clicked", tTodayStart, now),
    funnelCount("unlock_cta_clicked", t7d, now),
    funnelCount("checkout_started", tTodayStart, now),
    funnelCount("checkout_started", t7d, now),
    funnelCount("pdf_download_completed", tTodayStart, now),
    funnelCount("pdf_download_completed", t7d, now),
    prisma.reportUnlock
      .count({ where: { status: "paid", updatedAt: { gte: tTodayStart, lte: now } } })
      .catch(() => 0),
    prisma.reportUnlock
      .count({ where: { status: "paid", updatedAt: { gte: t7d, lte: now } } })
      .catch(() => 0),
    prisma.reportUnlock
      .aggregate({
        _sum: { amountCents: true },
        where: { status: "paid", updatedAt: { gte: tTodayStart, lte: now } },
      })
      .then((a) => a._sum.amountCents ?? 0)
      .catch(() => 0),
    prisma.reportUnlock
      .aggregate({
        _sum: { amountCents: true },
        where: { status: "paid", updatedAt: { gte: t7d, lte: now } },
      })
      .then((a) => a._sum.amountCents ?? 0)
      .catch(() => 0),
  ]);

  const preview7Ids = await distinctAnalysisFunnel7d("report_preview_viewed", t7d, now).catch(() => null);
  const paid7Ids = await distinctAnalysisPaid7d(t7d, now).catch(() => null);
  const both =
    preview7Ids && paid7Ids ? [...preview7Ids].filter((id) => paid7Ids.has(id)).length : 0;
  const previewN = preview7Ids?.size ?? 0;
  const paidN = paid7Ids?.size ?? 0;
  const rate = previewN > 0 ? ((both / previewN) * 100).toFixed(1) : "—";
  const rev7Ron = ron(sumCents7d);
  const avgPerPreview = previewN > 0 ? (rev7Ron / previewN).toFixed(2) : "—";

  const [quality7d, missingP, missingA, source7d] = await Promise.all([
    qualityFromDb7d(t7d, now),
    missingExtracted7d(t7d, now, "price"),
    missingExtracted7d(t7d, now, "area"),
    sourceHost7d(t7d, now),
  ]);

  return {
    today: {
      reportsGenerated: reportsToday,
      previewViews: fp(previewT.count, previewT.ok),
      unlockCtaClicks: fp(ctaT.count, ctaT.ok),
      checkoutStarts: fp(coT.count, coT.ok),
      paidUnlocks: paidT,
      revenueRon: ron(sumCentsToday),
      pdfDownloads: fp(pdfT.count, pdfT.ok),
    },
    last7d: {
      reportsGenerated: reports7d,
      previewViews: fp(prev7.count, prev7.ok),
      unlockCtaClicks: fp(cta7.count, cta7.ok),
      checkoutStarts: fp(co7.count, co7.ok),
      paidUnlocks: paid7,
      revenueRon: rev7Ron,
      pdfDownloads: fp(pdf7.count, pdf7.ok),
    },
    conversion: {
      previewAnalyses7d: previewN,
      paidAnalyses7d: paidN,
      both7d: both,
      previewToPaidRate: rate,
      avgRevenueRonPerPreviewAnalysis: avgPerPreview,
    },
    quality7d,
    missingPrice7d: missingP,
    missingArea7d: missingA,
    source7d,
  };
}

export async function loadFunnelFailureEvents7d(
  t7d: Date,
  now: Date,
): Promise<{ rows: { code: string; c: number }[]; ok: boolean }> {
  try {
    const list = await prisma.funnelEvent.findMany({
      where: { eventName: "analysis_failed", createdAt: { gte: t7d, lte: now } },
      select: { metadata: true },
      take: 20_000,
    });
    const byCode = new Map<string, number>();
    for (const row of list) {
      const m = row.metadata as Record<string, unknown> | null;
      const code = m && typeof m.code === "string" ? m.code : "other";
      byCode.set(code, (byCode.get(code) ?? 0) + 1);
    }
    return { rows: [...byCode.entries()].map(([code, c]) => ({ code, c })), ok: true };
  } catch {
    return { rows: [], ok: false };
  }
}

async function distinctAnalysisFunnel7d(
  eventName: string,
  t7d: Date,
  now: Date,
): Promise<Set<string> | null> {
  try {
    const rows = await prisma.funnelEvent.findMany({
      where: {
        eventName,
        createdAt: { gte: t7d, lte: now },
        analysisId: { not: null },
      },
      select: { analysisId: true },
      distinct: ["analysisId"],
    });
    return new Set(rows.map((r) => r.analysisId as string));
  } catch {
    return null;
  }
}

async function distinctAnalysisPaid7d(t7d: Date, now: Date): Promise<Set<string> | null> {
  try {
    const rows = await prisma.reportUnlock.findMany({
      where: { status: "paid", updatedAt: { gte: t7d, lte: now } },
      select: { analysisId: true },
      distinct: ["analysisId"],
    });
    return new Set(rows.map((r) => r.analysisId));
  } catch {
    return null;
  }
}

export async function qualityFromDb7d(t7d: Date, now: Date): Promise<QualityCounts> {
  const empty: QualityCounts = {
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
        AND a."updatedAt" >= ${t7d}
        AND a."updatedAt" <= ${now}
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
    /* leave zeros */
  }
  try {
    const compRows = await prisma.$queryRaw<{ bucket: string; c: bigint }[]>(Prisma.sql`
      WITH cnt AS (
        SELECT a.id AS aid, COALESCE(COUNT(cm.id), 0)::int AS n
        FROM "Analysis" a
        LEFT JOIN "CompMatch" cm ON cm."analysisId" = a.id
        WHERE a.status = 'done'
          AND a."updatedAt" >= ${t7d}
          AND a."updatedAt" <= ${now}
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
    /* leave zeros */
  }
  return empty;
}

export async function missingExtracted7d(
  t7d: Date,
  now: Date,
  field: "price" | "area",
): Promise<number> {
  try {
    if (field === "price") {
      return await prisma.extractedListing.count({
        where: {
          price: null,
          analysis: { status: "done", updatedAt: { gte: t7d, lte: now } },
        },
      });
    }
    return await prisma.extractedListing.count({
      where: {
        areaM2: null,
        analysis: { status: "done", updatedAt: { gte: t7d, lte: now } },
      },
    });
  } catch {
    return 0;
  }
}

const SOURCE_LABELS: [string, string][] = [
  ["imobiliare.ro", "imobiliare.ro"],
  ["storia.ro", "storia.ro"],
  ["olx.ro", "olx.ro"],
  ["publi24.ro", "publi24.ro"],
  ["lajumate.ro", "lajumate.ro"],
  ["homezz.ro", "homezz.ro"],
];

export function hostnameKey(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return "unknown";
  try {
    const h = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    for (const [k, v] of SOURCE_LABELS) {
      if (h === v || h.endsWith(`.${v}`)) return k;
    }
    return h || "unknown";
  } catch {
    return "unknown";
  }
}

export async function sourceHost7d(t7d: Date, now: Date): Promise<SourceRow[]> {
  const map = new Map<string, number>();
  for (const [label] of SOURCE_LABELS) {
    map.set(label, 0);
  }
  map.set("unknown", 0);
  try {
    const rows = await prisma.analysis.findMany({
      where: { status: "done", updatedAt: { gte: t7d, lte: now } },
      select: { sourceUrl: true },
      take: 12_000,
    });
    for (const r of rows) {
      const key = hostnameKey(r.sourceUrl);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  } catch {
    return [
      ...SOURCE_LABELS.map(([label]) => ({ label, count: 0 })),
      { label: "unknown", count: 0 },
    ];
  }
  const out: SourceRow[] = [];
  for (const [label, c] of SOURCE_LABELS) {
    out.push({ label, count: map.get(label) ?? 0 });
  }
  out.push({ label: "unknown", count: map.get("unknown") ?? 0 });
  for (const [k, v] of map) {
    if (SOURCE_LABELS.some(([a]) => a === k) || k === "unknown") continue;
    if (v > 0) out.push({ label: k, count: v });
  }
  return out;
}

export function buildFailureBucketsMerged(
  funnelF: { rows: { code: string; c: number }[]; ok: boolean },
  missingPrice: number,
  missingArea: number,
  noComps: number,
): FailureBucket[] {
  const order: { key: string; label: string; count: number }[] = [
    { key: "unsupported", label: "Domeniu neacceptat (nu reiese din DB)", count: 0 },
    { key: "no_data", label: "Extragere eșuată (fără date)", count: 0 },
    { key: "missing_price", label: "Lipsește preț (raport finalizat, fără preț anunț)", count: missingPrice },
    { key: "missing_area", label: "Lipsește suprafață (raport finalizat)", count: missingArea },
    { key: "no_comps", label: "Fără comparabile (0 comp, raport finalizat)", count: noComps },
    { key: "pipeline_error", label: "Eroare pipeline", count: 0 },
    { key: "rejected", label: "Respingere conținut (închirieri / neacceptat)", count: 0 },
    { key: "other", label: "Altele (funnel: cod generic)", count: 0 },
  ];
  if (funnelF.ok) {
    for (const r of funnelF.rows) {
      if (r.code === "no_data") {
        const o = order.find((x) => x.key === "no_data");
        if (o) o.count += r.c;
      } else if (r.code === "rejected" || (typeof r.code === "string" && r.code.startsWith("rejected"))) {
        const o = order.find((x) => x.key === "rejected");
        if (o) o.count += r.c;
      } else if (r.code === "pipeline_error") {
        const o = order.find((x) => x.key === "pipeline_error");
        if (o) o.count += r.c;
      } else {
        const o = order.find((x) => x.key === "other");
        if (o) o.count += r.c;
      }
    }
  }
  return order.map(({ key, label, count }) => ({ key, label, count }));
}

export async function getMoneyDashboard(): Promise<MoneyDashboardData> {
  const tToday = startOfUtcDay();
  const t7d = last7dStart();
  const now = new Date();

  const [core, fRows] = await Promise.all([getMoneyDashTodayAnd7d(tToday, t7d, now), loadFunnelFailureEvents7d(t7d, now)]);

  const failureBuckets = buildFailureBucketsMerged(
    fRows,
    core.missingPrice7d,
    core.missingArea7d,
    core.quality7d.comps0,
  );

  return {
    now: now.toISOString(),
    todayStartUtc: tToday.toISOString(),
    last7dStart: t7d.toISOString(),
    today: core.today,
    last7d: core.last7d,
    conversion: core.conversion,
    quality7d: core.quality7d,
    missingPrice7d: core.missingPrice7d,
    missingArea7d: core.missingArea7d,
    source7d: core.source7d,
    failure7d: { buckets: failureBuckets, funnelFailuresAvailable: fRows.ok },
  };
}
