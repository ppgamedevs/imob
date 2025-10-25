// Step 11: Unit enrichment pipeline
// Computes derived metrics: eurM2, yieldNet, ttsBucket, riskClass

import { prisma } from "@/lib/db";
import type { Unit } from "@prisma/client";

// Import existing engines
import { estimateRent } from "@/lib/ml/rent";
import { estimateTTS } from "@/lib/ml/tts";
import { estimateSeismic } from "@/lib/ml/seismic";
import type { NormalizedFeatures } from "@/types/analysis";

export interface UnitFeatures {
  areaM2: number;
  rooms: number;
  floor?: string;
  yearBuilt?: number;
  lat?: number;
  lng?: number;
  orientation?: string;
  parkingAvail?: boolean;
  city?: string;
  areaSlug?: string;
}

export interface EnrichmentResult {
  eurM2: number;
  yieldNet?: number;
  ttsBucket?: string;
  riskClass?: string;
  explain: {
    rentEstimate?: number;
    ttsEstimate?: number;
    seismicScore?: number;
    features: UnitFeatures;
  };
}

/**
 * Compute all derived metrics for a single unit
 */
export async function computeUnitMetrics(
  unit: Unit,
  development: { lat?: number | null; lng?: number | null; areaSlug?: string | null }
): Promise<EnrichmentResult> {
  // 1. Compute €/m²
  const eurM2 = unit.areaM2 > 0 ? unit.priceEur / unit.areaM2 : 0;

  const features: UnitFeatures = {
    areaM2: unit.areaM2,
    rooms: unit.rooms || parseRoomsFromTypology(unit.typology),
    floor: unit.floor || "0",
    lat: development.lat || undefined,
    lng: development.lng || undefined,
    orientation: unit.orientation || undefined,
    parkingAvail: unit.parkingAvail || false,
    city: "București", // default
    areaSlug: development.areaSlug || undefined,
  };

  const explain: EnrichmentResult["explain"] = {
    features,
  };

  // 2. Estimate rent (for yield calculation)
  let yieldNet: number | undefined;
  try {
    const rentResult = await estimateRent(features as any);
    if (rentResult.rentEur && rentResult.rentEur > 0) {
      // Net yield = (annual rent - expenses) / price
      // Assume 15% expenses (management, maintenance, vacancy)
      const annualRent = rentResult.rentEur * 12;
      const netRent = annualRent * 0.85;
      yieldNet = (netRent / unit.priceEur) * 100;
      explain.rentEstimate = rentResult.rentEur;
    }
  } catch (err) {
    console.warn(`[enrich] Failed to estimate rent for unit ${unit.id}:`, err);
  }

  // 3. Estimate TTS (time to sell)
  let ttsBucket: string | undefined;
  try {
    const ttsResult = await estimateTTS({
      asking: unit.priceEur,
      areaSlug: development.areaSlug,
      areaM2: unit.areaM2,
    });
    if (ttsResult) {
      ttsBucket = ttsResult.bucket;
      explain.ttsEstimate = ttsResult.scoreDays;
    }
  } catch (err) {
    console.warn(`[enrich] Failed to estimate TTS for unit ${unit.id}:`, err);
  }

  // 4. Estimate seismic risk
  let riskClass: string | undefined;
  if (features.lat && features.lng) {
    try {
      const seismicScore = await estimateSeismic({
        lat: features.lat,
        lng: features.lng,
        yearBuilt: features.yearBuilt,
      });
      if (seismicScore !== undefined) {
        riskClass = classifySeismicRisk(seismicScore);
        explain.seismicScore = seismicScore;
      }
    } catch (err) {
      console.warn(`[enrich] Failed to estimate seismic for unit ${unit.id}:`, err);
    }
  }

  return {
    eurM2: Math.round(eurM2),
    yieldNet: yieldNet ? Math.round(yieldNet * 100) / 100 : undefined,
    ttsBucket,
    riskClass,
    explain,
  };
}

/**
 * Batch enrich all units for a development
 */
export async function batchEnrichDevelopment(developmentId: string): Promise<{
  updated: number;
  failed: number;
}> {
  const development = await prisma.development.findUnique({
    where: { id: developmentId },
    select: { lat: true, lng: true, areaSlug: true },
  });

  if (!development) {
    throw new Error(`Development ${developmentId} not found`);
  }

  const units = await prisma.unit.findMany({
    where: { developmentId },
  });

  let updated = 0;
  let failed = 0;

  // Process with small concurrency to avoid overwhelming the system
  const concurrency = 5;
  for (let i = 0; i < units.length; i += concurrency) {
    const batch = units.slice(i, i + concurrency);
    const promises = batch.map(async (unit) => {
      try {
        const metrics = await computeUnitMetrics(unit, development);
        await prisma.unit.update({
          where: { id: unit.id },
          data: {
            eurM2: metrics.eurM2,
            yieldNet: metrics.yieldNet,
            ttsBucket: metrics.ttsBucket,
            riskClass: metrics.riskClass,
            explain: metrics.explain as any,
          },
        });
        updated++;
      } catch (err) {
        console.error(`[enrich] Failed to enrich unit ${unit.id}:`, err);
        failed++;
      }
    });

    await Promise.all(promises);
  }

  return { updated, failed };
}

/**
 * Enrich a single unit (used after bulk upsert)
 */
export async function enrichUnit(unitId: string): Promise<void> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      development: {
        select: { lat: true, lng: true, areaSlug: true },
      },
    },
  });

  if (!unit) {
    throw new Error(`Unit ${unitId} not found`);
  }

  const metrics = await computeUnitMetrics(unit, unit.development);
  await prisma.unit.update({
    where: { id: unitId },
    data: {
      eurM2: metrics.eurM2,
      yieldNet: metrics.yieldNet,
      ttsBucket: metrics.ttsBucket,
      riskClass: metrics.riskClass,
      explain: metrics.explain as any,
    },
  });
}

// ========================================
// Helper functions
// ========================================

function parseRoomsFromTypology(typology: string): number {
  const match = typology.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  if (typology.toLowerCase().includes("studio")) return 1;
  if (typology.toLowerCase().includes("penthouse")) return 3;
  if (typology.toLowerCase().includes("duplex")) return 3;
  return 2; // default
}

function bucketizeTTS(days: number): string {
  if (days <= 30) return "< 1 month";
  if (days <= 60) return "1-2 months";
  if (days <= 90) return "2-3 months";
  if (days <= 180) return "3-6 months";
  return "> 6 months";
}

function classifySeismicRisk(score: number): string {
  // Lower score = better (less risk)
  if (score <= 0.2) return "A"; // Very low risk
  if (score <= 0.4) return "B"; // Low risk
  if (score <= 0.6) return "C"; // Medium risk
  if (score <= 0.8) return "Dw"; // High risk (requires strengthening)
  return "D"; // Very high risk
}
