import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { findNearbyRiskBuildings, lookupSeismicFromDb } from "./seismic-db";

export async function applySeismicToAnalysis(analysisId: string, features: Record<string, unknown>) {
  const f = features ?? {};
  const lat = (f.lat as number) ?? null;
  const lng = (f.lng as number) ?? null;
  const addressRaw =
    (f.addressRaw as string) ??
    (f.address_raw as string) ??
    (f.address as string) ??
    null;
  const yearBuilt =
    (f.yearBuilt as number) ?? (f.year_built as number) ?? null;
  const areaSlug = (f.areaSlug as string) ?? (f.area_slug as string) ?? null;

  let sector: number | null = null;
  if (areaSlug) {
    const m = areaSlug.match(/sector-?(\d)/i);
    if (m) sector = Number(m[1]);
  }
  if (!sector && addressRaw) {
    const m = addressRaw.match(/sector(?:ul)?\s*(\d)/i);
    if (m) sector = Number(m[1]);
  }

  const match = await lookupSeismicFromDb({
    lat,
    lng,
    addressRaw,
    sector,
    yearBuilt,
  });

  // Find nearby risk buildings if we have coordinates
  let nearby: Awaited<ReturnType<typeof findNearbyRiskBuildings>> = [];
  if (lat != null && lng != null) {
    nearby = await findNearbyRiskBuildings(lat, lng, 200);
  }

  const nearbyRsI = nearby.filter((n) => n.riskClass === "RsI").length;
  const nearbyRsII = nearby.filter((n) => n.riskClass === "RsII").length;

  const existing = await prisma.scoreSnapshot.findUnique({ where: { analysisId } });
  const existingExplain = (existing?.explain as Record<string, unknown>) ?? {};

  const seismicExplain = {
    riskClass: match.riskClass,
    confidence: match.confidence,
    method: match.method,
    note: match.note,
    matchedAddress: match.matchedAddress,
    intervention: match.intervention,
    matchedYearBuilt: match.yearBuilt,
    source: match.source,
    sourceUrl: match.sourceUrl,
    nearby: {
      total: nearby.length,
      rsI: nearbyRsI,
      rsII: nearbyRsII,
      buildings: nearby.slice(0, 5).map((n) => ({
        address: n.addressRaw,
        riskClass: n.riskClass,
        distanceM: n.distanceM,
        intervention: n.intervention,
      })),
    },
  };

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      riskClass: String(match.riskClass),
      riskSource: match.sourceUrl ?? match.source ?? null,
      explain: { ...existingExplain, seismic: seismicExplain } as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotUpdateInput,
    create: {
      analysisId,
      riskClass: String(match.riskClass),
      riskSource: match.sourceUrl ?? match.source ?? null,
      explain: { seismic: seismicExplain } as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotCreateInput,
  });

  return { match, nearby };
}
