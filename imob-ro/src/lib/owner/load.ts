/**
 * Owner Dashboard Loader
 * Loads analysis + draft + computes ROI items + Pre-Market Score
 */

import { prisma } from "@/lib/db";
import type { OwnerDashboardData } from "@/types/owner";

import { buildRoiSuggestions } from "./roi";
import { computePreMarketScore } from "./score";

/**
 * Load complete owner dashboard data for a given analysis ID
 */
export async function loadOwnerDashboard(analysisId: string): Promise<OwnerDashboardData | null> {
  // Load analysis with all relations
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      extractedListing: true,
      featureSnapshot: true,
      scoreSnapshot: true,
      ownerDraft: true,
    },
  });

  if (!analysis) {
    return null;
  }

  // If no owner draft exists, create one
  let draft = analysis.ownerDraft;
  if (!draft) {
    draft = await prisma.ownerDraft.create({
      data: {
        analysisId,
        status: "draft",
      },
    });
  }

  // Parse ROI toggles from draft
  const roiToggles =
    (draft.roiToggles as Record<string, boolean> | null) ?? ({} as Record<string, boolean>);

  // Extract features for ROI suggestions
  const features =
    (analysis.featureSnapshot?.features as Record<string, any> | null) ??
    ({} as Record<string, any>);
  const explainQuality = analysis.scoreSnapshot?.explain?.quality as
    | {
        photos?: { count: number; score: number };
        text?: { length: number; score: number };
        completeness?: { missing: string[]; score: number };
      }
    | undefined;

  // Build ROI suggestions
  const roiItems = buildRoiSuggestions(features, explainQuality).map((item) => ({
    ...item,
    selected: roiToggles[item.id] ?? false,
  }));

  // Compute Pre-Market Score
  const selectedFixes = roiItems.filter((x) => x.selected).map((x) => x.id);
  const preMarketScore = computePreMarketScore({
    avmMid: analysis.scoreSnapshot?.avmMid ?? undefined,
    priceEur: analysis.extractedListing?.price ?? undefined,
    photosCount: explainQuality?.photos?.count,
    textLength: explainQuality?.text?.length,
    fixesSelected: selectedFixes,
    distMetroM: features.distMetroM,
    yearBuilt: analysis.extractedListing?.yearBuilt ?? undefined,
    demand: features.demandScore ?? 0.5,
  });

  // Assemble dashboard data
  const data: OwnerDashboardData = {
    analysisId: analysis.id,
    draft: {
      id: draft.id,
      status: draft.status,
      addressNote: draft.addressNote ?? undefined,
      contactName: draft.contactName ?? undefined,
      contactEmail: draft.contactEmail ?? undefined,
      shareToken: draft.shareToken,
      roiToggles,
    },
    listing: {
      title: analysis.extractedListing?.title ?? undefined,
      price: analysis.extractedListing?.price ?? undefined,
      areaM2: analysis.extractedListing?.areaM2 ?? undefined,
      rooms: analysis.extractedListing?.rooms ?? undefined,
      floor: analysis.extractedListing?.floor ?? undefined,
      yearBuilt: analysis.extractedListing?.yearBuilt ?? undefined,
      address: analysis.extractedListing?.addressRaw ?? undefined,
      lat: analysis.extractedListing?.lat ?? undefined,
      lng: analysis.extractedListing?.lng ?? undefined,
      photos:
        (analysis.extractedListing?.photos as { url: string }[] | null)?.map((p) => p.url) ?? [],
    },
    scores: {
      avmLow: analysis.scoreSnapshot?.avmLow ?? undefined,
      avmMid: analysis.scoreSnapshot?.avmMid ?? undefined,
      avmHigh: analysis.scoreSnapshot?.avmHigh ?? undefined,
      avmConf: analysis.scoreSnapshot?.avmConf ?? undefined,
      priceBadge: analysis.scoreSnapshot?.priceBadge ?? undefined,
      ttsBucket: analysis.scoreSnapshot?.ttsBucket ?? undefined,
      yieldGross: analysis.scoreSnapshot?.yieldGross ?? undefined,
      yieldNet: analysis.scoreSnapshot?.yieldNet ?? undefined,
      riskSeismic: analysis.scoreSnapshot?.riskSeismic ?? undefined,
      riskClass: analysis.scoreSnapshot?.riskClass ?? undefined,
      condition: analysis.scoreSnapshot?.condition ?? undefined,
      conditionScore: analysis.scoreSnapshot?.conditionScore ?? undefined,
      explain: analysis.scoreSnapshot?.explain,
    },
    roiItems,
    preMarketScore,
  };

  return data;
}
