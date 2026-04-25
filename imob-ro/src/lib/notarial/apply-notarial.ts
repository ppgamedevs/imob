import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { detectPropertyType } from "@/lib/property-type";

import { lookupNotarialGrid } from "./lookup";
import {
  NOTARIAL_NEUTRAL_COPY_RO,
  NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO,
  type NotarialReferenceDiagnostics,
  validateNotarialReference,
} from "./notarial-validate";

function isApartmentGridKind(title: string | null, rooms: number | null): boolean {
  const pt = detectPropertyType(title, rooms);
  return (
    pt === "apartament" ||
    pt === "garsoniera" ||
    pt === "studio" ||
    pt === "mansarda" ||
    pt === "penthouse" ||
    pt === "duplex"
  );
}

function buildPropertyKind(title: string | null, rooms: number | null): "apartment" | "other" {
  return isApartmentGridKind(title, rooms) ? "apartment" : "other";
}

export async function applyNotarialToAnalysis(
  analysisId: string,
  features: Record<string, unknown>,
) {
  const ex = await prisma.extractedListing.findUnique({
    where: { analysisId },
    select: { title: true, rooms: true, addressRaw: true },
  });
  const areaM2 =
    typeof features.areaM2 === "number"
      ? features.areaM2
      : typeof features.area_m2 === "number"
        ? features.area_m2
        : null;

  const title =
    (typeof features.title === "string" ? features.title : null) ??
    (ex?.title as string | null) ??
    null;
  const rooms =
    (typeof features.rooms === "number" ? features.rooms : null) ??
    (ex?.rooms as number | null) ??
    null;
  const propertyKind = buildPropertyKind(title, rooms);

  const priceEur =
    typeof features.priceEur === "number" && Number.isFinite(features.priceEur)
      ? features.priceEur
      : null;

  const existingScore = await prisma.scoreSnapshot.findUnique({
    where: { analysisId },
    select: { avmMid: true, explain: true },
  });
  const avmMidEur =
    typeof existingScore?.avmMid === "number" && Number.isFinite(existingScore.avmMid)
      ? existingScore.avmMid
      : null;

  const areaSlug =
    typeof features.areaSlug === "string"
      ? features.areaSlug
      : typeof features.area_slug === "string"
        ? features.area_slug
        : null;
  const addressRaw =
    (typeof features.addressRaw === "string"
      ? features.addressRaw
      : typeof features.address_raw === "string"
        ? features.address_raw
        : null) ??
    (ex?.addressRaw as string | null) ??
    null;

  if (!areaM2 || areaM2 <= 0) {
    const emptyDiag: Record<string, unknown> = {
      matched: false,
      canShow: false,
      source: "NotarialGrid" as const,
      suppressReason: "missing_area",
      propertyType: propertyKind === "apartment" ? "apartment" : "other",
      matchMethod: "none" as const,
      gridYear: null,
      gridZone: null,
      gridSubzone: null,
      rawValue: null,
      rawCurrency: "unknown" as const,
      rawUnit: "unknown" as const,
      interpretedEurM2: null,
      areaM2Used: null,
      computedTotalEur: null,
      matchConfidence: "low" as const,
      confidence: "low" as const,
      displayTotalEur: null,
      displayEurM2: null,
    };
    await writeNotarialExplain(analysisId, emptyDiag);
    await clearNotarialColumns(analysisId);
    return null;
  }

  const result = await lookupNotarialGrid({
    areaM2,
    sector: typeof features.sector === "number" ? features.sector : null,
    neighborhood: typeof features.neighborhood === "string" ? features.neighborhood : null,
    areaSlug,
    addressRaw,
    propertyType: "apartment",
  });

  const existingExplain = (existingScore?.explain as Record<string, unknown>) ?? {};
  const currentYear = new Date().getFullYear();

  if (!result) {
    const diag: NotarialReferenceDiagnostics = {
      matched: false,
      source: "NotarialGrid",
      gridYear: null,
      gridZone: null,
      gridSubzone: null,
      propertyType: "apartment",
      rawValue: null,
      rawCurrency: "unknown",
      rawUnit: "unknown",
      interpretedEurM2: null,
      areaM2Used: areaM2,
      computedTotalEur: null,
      matchMethod: "none",
      matchConfidence: "low",
      suppressReason: "no_grid_match",
      canShow: false,
      displayTotalEur: null,
      displayEurM2: null,
      confidence: "low",
    };
    await writeNotarialExplain(analysisId, { ...diag });
    await clearNotarialColumns(analysisId);
    return null;
  }

  const v = validateNotarialReference({
    propertyKind,
    isBucharestIlfov: isBucharestIlfovFromAddress(features, addressRaw, areaSlug),
    areaM2Used: areaM2,
    interpretedEurM2: result.eurPerM2,
    rawCurrency: "EUR",
    rawUnit: "eur_m2",
    computedTotalEur: result.totalValue,
    matchMethod: result.matchMethod,
    gridYear: result.year,
    gridZone: result.zone,
    gridSubzone: result.gridSubzone,
    currentYear,
    askingPriceEur: priceEur,
    avmMidEur,
  });

  const explainPayload = {
    ...v.diagnostics,
    canShow: v.canShow,
    suppressReason: v.suppressReason ?? v.diagnostics.suppressReason,
    displayTotalEur: v.displayTotalEur ?? null,
    displayEurM2: v.displayEurM2 ?? null,
    confidence: v.confidence,
    neutralCopyRo: v.canShow ? null : NOTARIAL_NEUTRAL_COPY_RO,
    fiscalContextNoteRo: NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO,
    computedTotalEur: result.totalValue,
    interpretedEurM2: result.eurPerM2,
    gridZone: result.zone,
    gridYear: result.year,
    gridSubzone: result.gridSubzone,
    matchMethod: result.matchMethod,
    rawValue: result.rawEurPerM2,
    totalValue: result.totalValue,
    eurPerM2: result.eurPerM2,
    zone: result.zone,
    year: result.year,
    source: result.source,
    matched: true,
  };

  const mergedExplain = { ...existingExplain, notarial: explainPayload } as Prisma.InputJsonValue;
  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      notarialEurM2: v.canShow && v.displayEurM2 != null ? v.displayEurM2 : null,
      notarialTotal: v.canShow && v.displayTotalEur != null ? v.displayTotalEur : null,
      notarialYear: v.canShow ? result.year : null,
      notarialZone: v.canShow ? result.zone : null,
      explain: mergedExplain,
    },
    create: {
      analysisId,
      notarialEurM2: v.canShow && v.displayEurM2 != null ? v.displayEurM2 : null,
      notarialTotal: v.canShow && v.displayTotalEur != null ? v.displayTotalEur : null,
      notarialYear: v.canShow ? result.year : null,
      notarialZone: v.canShow ? result.zone : null,
      explain: mergedExplain,
    },
  });

  return v.canShow ? result : null;
}

async function writeNotarialExplain(analysisId: string, notarial: Record<string, unknown>) {
  const existing = await prisma.scoreSnapshot.findUnique({
    where: { analysisId },
    select: { explain: true },
  });
  const ex = (existing?.explain as Record<string, unknown>) ?? {};
  const explain = { ...ex, notarial } as Prisma.InputJsonValue;
  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: { explain },
    create: { analysisId, explain },
  });
}

async function clearNotarialColumns(analysisId: string) {
  await prisma.scoreSnapshot.updateMany({
    where: { analysisId },
    data: { notarialEurM2: null, notarialTotal: null, notarialYear: null, notarialZone: null },
  });
}

function isBucharestIlfovFromAddress(
  features: Record<string, unknown>,
  addressRaw: string | null,
  areaSlug: string | null,
): boolean {
  const city = (typeof features.city === "string" ? features.city : "") ?? "";
  const t = `${city} ${areaSlug ?? ""} ${addressRaw ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (t.includes("bucuresti") || t.includes("bucharest")) return true;
  if (
    t.includes("ilfov") ||
    t.includes("voluntari") ||
    t.includes("chitila") ||
    t.includes("otopeni")
  ) {
    return true;
  }
  if (/(^|\s)sector(\s+|-)?[1-6](\b|\s|\.)/.test(t)) return true;
  return false;
}
