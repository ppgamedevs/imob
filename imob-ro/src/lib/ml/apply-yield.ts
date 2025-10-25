import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { NormalizedFeatures } from "@/types/analysis";

import { estimateRent } from "./rent";

const OPEX_RATE = Number(process.env.OPEX_RATE ?? 0.15);
const VACANCY_BASE = Number(process.env.VACANCY_BASE ?? 0.06);
const CAPEX_HIGH = Number(process.env.CAPEX_HIGH ?? 3000);
const CAPEX_MED = Number(process.env.CAPEX_MED ?? 1200);
const CAPEX_LOW = Number(process.env.CAPEX_LOW ?? 400);
const HOA_FEE = Number(process.env.HOA_FEE ?? 40);

function capexPerYear(conditionScore?: number | null) {
  if (conditionScore == null) return CAPEX_MED;
  if (conditionScore <= 0.35) return CAPEX_HIGH;
  if (conditionScore >= 0.75) return CAPEX_LOW;
  return CAPEX_MED;
}

function vacancyRateFromDemand(demandScore?: number | null) {
  const adj = demandScore != null ? -0.5 * (demandScore - 1.0) : 0;
  return Math.max(0.02, VACANCY_BASE + adj);
}

export async function applyYieldToAnalysis(analysisId: string, features: NormalizedFeatures) {
  const priceEur = (features as any).priceEur ?? null;
  if (!priceEur || priceEur <= 0) {
    await prisma.scoreSnapshot.upsert({
      where: { analysisId },
      update: { yieldGross: null, yieldNet: null },
      create: {
        analysisId,
        avmLow: 0,
        avmHigh: 0,
        avmConf: 0,
        ttsBucket: "unknown",
        yieldGross: null,
        yieldNet: null,
      },
    });
    return null;
  }

  const { rentEur, eurM2, explain } = await estimateRent(features);

  const area = (features as any).areaSlug ?? null;
  const ad = area
    ? await prisma.areaDaily.findFirst({
        where: { areaSlug: area },
        orderBy: { date: "desc" },
        select: { demandScore: true },
      })
    : null;
  const vacancy = vacancyRateFromDemand(ad?.demandScore ?? null);

  const annualGross = rentEur ? rentEur * 12 : null;
  const grossYield = annualGross && priceEur ? annualGross / priceEur : null;

  const capex = capexPerYear((features as any).conditionScore);
  const annualOpex = rentEur ? rentEur * 12 * OPEX_RATE : null;
  const annualVacancyLoss = rentEur ? rentEur * 12 * vacancy : null;
  const annualHoa = rentEur ? HOA_FEE * 12 : null;

  const annualNet =
    annualGross != null && annualOpex != null && annualVacancyLoss != null && annualHoa != null
      ? Math.max(0, annualGross - annualOpex - annualVacancyLoss - capex - annualHoa)
      : null;

  const netYield = annualNet != null && priceEur ? annualNet / priceEur : null;

  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      // store top-level yield fields and keep rent inside explain
      yieldGross: grossYield ?? null,
      yieldNet: netYield ?? null,
      explain: {
        rent: { eurM2, rentEur, ...explain },
        yield: {
          inputs: { priceEur, rentEur, vacancy, opexRate: OPEX_RATE, capex, hoa: HOA_FEE },
          annual: {
            gross: annualGross,
            opex: annualOpex,
            vacancy: annualVacancyLoss,
            capex,
            hoa: annualHoa,
            net: annualNet,
          },
        },
      } as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotUpdateInput,
    create: {
      analysisId,
      yieldGross: grossYield ?? null,
      yieldNet: netYield ?? null,
      explain: {
        rent: { eurM2, rentEur, ...explain },
        yield: {
          inputs: { priceEur, rentEur, vacancy, opexRate: OPEX_RATE, capex, hoa: HOA_FEE },
          annual: {
            gross: annualGross,
            opex: annualOpex,
            vacancy: annualVacancyLoss,
            capex,
            hoa: annualHoa,
            net: annualNet,
          },
        },
      } as Prisma.JsonObject,
    } as unknown as Prisma.ScoreSnapshotCreateInput,
  });

  return { rentEur, grossYield, netYield };
}
