import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalAnalyses,
    analyses24h,
    analysesWeek,
    doneAnalyses,
    failedAnalyses,
    totalCrawlJobs,
    crawlDone24h,
    crawlErrors24h,
    crawlDetailDone,
    crawlDetailQueued,
    crawlDetailError,
    totalExtractedListings,
    totalComps,
    fieldCompleteness,
    modelSnapshot,
    avmTrainLog,
  ] = await Promise.all([
    prisma.analysis.count(),
    prisma.analysis.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.analysis.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.analysis.count({ where: { status: "done" } }),
    prisma.analysis.count({ where: { status: { in: ["error", "failed"] } } }),
    prisma.crawlJob.count(),
    prisma.crawlJob.count({ where: { doneAt: { gte: dayAgo }, status: "done" } }),
    prisma.crawlJob.count({ where: { doneAt: { gte: dayAgo }, status: "error" } }),
    prisma.crawlJob.count({ where: { kind: "detail", status: "done" } }),
    prisma.crawlJob.count({ where: { kind: "detail", status: "queued" } }),
    prisma.crawlJob.count({ where: { kind: "detail", status: "error" } }),
    prisma.extractedListing.count(),
    prisma.compMatch.count(),
    computeFieldCompleteness(),
    prisma.modelSnapshot.findFirst({ where: { kind: "avm" }, orderBy: { createdAt: "desc" } }),
    prisma.cronLog.findFirst({ where: { name: "avm-train" }, orderBy: { startedAt: "desc" } }),
  ]);

  const mlReadiness = {
    totalTrainingSamples: doneAnalyses,
    minimumRequired: 1000,
    ready: doneAnalyses >= 1000,
    latestModel: modelSnapshot
      ? {
          version: modelSnapshot.version,
          kind: modelSnapshot.kind,
          createdAt: modelSnapshot.createdAt,
          metrics: modelSnapshot.metrics,
        }
      : null,
    lastTrainingRun: avmTrainLog
      ? {
          status: avmTrainLog.status,
          startedAt: avmTrainLog.startedAt,
          duration: avmTrainLog.duration,
        }
      : null,
  };

  return NextResponse.json({
    timestamp: now.toISOString(),
    ingestion: {
      totalAnalyses,
      analyses24h,
      analysesWeek,
      doneAnalyses,
      failedAnalyses,
      successRate: totalAnalyses > 0
        ? Number(((doneAnalyses / totalAnalyses) * 100).toFixed(1))
        : 0,
      crawl: {
        totalJobs: totalCrawlJobs,
        done24h: crawlDone24h,
        errors24h: crawlErrors24h,
        /** URL-uri de anunț (detail) scrape-uite cu succes */
        detailDone: crawlDetailDone,
        detailQueued: crawlDetailQueued,
        detailError: crawlDetailError,
      },
      /** Total anunțuri cu date în DB (ExtractedListing) */
      totalExtractedListings,
      totalComps,
    },
    fieldCompleteness,
    mlReadiness,
  });
}

async function computeFieldCompleteness() {
  const total = await prisma.extractedListing.count();
  if (total === 0) return { total: 0, fields: {} };

  const [
    withPrice,
    withArea,
    withRooms,
    withFloor,
    withYear,
    withAddress,
    withPhotos,
    withCoords,
  ] = await Promise.all([
    prisma.extractedListing.count({ where: { price: { not: null } } }),
    prisma.extractedListing.count({ where: { areaM2: { not: null } } }),
    prisma.extractedListing.count({ where: { rooms: { not: null } } }),
    prisma.extractedListing.count({
      where: { OR: [{ floor: { not: null } }, { floorRaw: { not: null } }] },
    }),
    prisma.extractedListing.count({ where: { yearBuilt: { not: null } } }),
    prisma.extractedListing.count({ where: { addressRaw: { not: null } } }),
    prisma.extractedListing.count({ where: { NOT: { photos: { equals: null } } } }),
    prisma.extractedListing.count({
      where: { lat: { not: null }, lng: { not: null } },
    }),
  ]);

  const pct = (n: number) => Number(((n / total) * 100).toFixed(1));

  return {
    total,
    fields: {
      price: { count: withPrice, pct: pct(withPrice) },
      area: { count: withArea, pct: pct(withArea) },
      rooms: { count: withRooms, pct: pct(withRooms) },
      floor: { count: withFloor, pct: pct(withFloor) },
      yearBuilt: { count: withYear, pct: pct(withYear) },
      address: { count: withAddress, pct: pct(withAddress) },
      photos: { count: withPhotos, pct: pct(withPhotos) },
      coords: { count: withCoords, pct: pct(withCoords) },
    },
  };
}
