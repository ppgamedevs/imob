// Step 11: Development data loading helpers

import { prisma } from "@/lib/db";
import type {
  CatalogProject,
  DevelopmentFilters,
  ProjectDetailDTO,
  UnitStats,
  UnitWithMetrics,
} from "@/types/development";

/**

/**
 * Load developments for catalog page with filters
 */
export async function loadDevelopments(
  filters: DevelopmentFilters,
): Promise<{ projects: CatalogProject[]; total: number; hasMore: boolean }> {
  const {
    areas,
    typologies,
    minPrice,
    maxPrice,
    deliveryFrom,
    deliveryTo,
    stage,
    page = 1,
    limit = 12,
    sort = "relevance",
  } = filters;

  // Build where clause
  const where: any = {};

  if (areas && areas.length > 0) {
    where.areaSlug = { in: areas };
  }

  if (deliveryFrom || deliveryTo) {
    where.deliveryAt = {};
    if (deliveryFrom) where.deliveryAt.gte = new Date(deliveryFrom);
    if (deliveryTo) where.deliveryAt.lte = new Date(deliveryTo);
  }

  // Get developments
  const skip = (page - 1) * limit;
  const developments = await prisma.development.findMany({
    where,
    include: {
      developer: {
        select: { name: true, logoUrl: true },
      },
      units: {
        where: {
          ...(typologies && typologies.length > 0 ? { typology: { in: typologies } } : {}),
          ...(minPrice ? { priceEur: { gte: minPrice } } : {}),
          ...(maxPrice ? { priceEur: { lte: maxPrice } } : {}),
          ...(stage && stage.length > 0 ? { stage: { in: stage } } : {}),
        },
        select: {
          typology: true,
          priceEur: true,
          eurM2: true,
          yieldNet: true,
          riskClass: true,
          stage: true,
        },
      },
    },
    skip,
    take: limit + 1, // Fetch one extra to check if there are more
    orderBy: getOrderBy(sort),
  });

  const hasMore = developments.length > limit;
  const projects = developments.slice(0, limit);
  const total = await prisma.development.count({ where });

  // Transform to catalog format
  const catalogProjects: CatalogProject[] = projects.map((dev) => {
    const photos = (dev.photos as string[]) || [];
    const unitMix = computeUnitMix(dev.units);
    const minPrice = dev.units.length > 0 ? Math.min(...dev.units.map((u) => u.priceEur)) : 0;
    const deliveryQuarter = dev.deliveryAt ? formatDeliveryQuarter(dev.deliveryAt) : undefined;
    const badges = computeBadges(dev, dev.units);

    return {
      slug: dev.slug,
      name: dev.name,
      coverPhoto: photos[0],
      developerLogo: dev.developer?.logoUrl || undefined,
      developerName: dev.developer?.name || undefined,
      areaName: dev.areaSlug ? formatAreaName(dev.areaSlug) : undefined,
      unitMix,
      minPrice,
      deliveryQuarter,
      badges,
    };
  });

  return { projects: catalogProjects, total, hasMore };
}

/**
 * Load project detail page data
 */
export async function loadProjectDetail(slug: string): Promise<ProjectDetailDTO | null> {
  const development = await prisma.development.findUnique({
    where: { slug },
    include: {
      developer: true,
      units: {
        orderBy: [{ typology: "asc" }, { priceEur: "asc" }],
      },
    },
  });

  if (!development) return null;

  const units = development.units as UnitWithMetrics[];
  const photos = (development.photos as string[]) || [];
  const amenities = (development.amenities as string[]) || [];
  const unitStats = computeUnitMix(units);

  const minPrice = units.length > 0 ? Math.min(...units.map((u) => u.priceEur)) : 0;
  const maxPrice = units.length > 0 ? Math.max(...units.map((u) => u.priceEur)) : 0;

  const eurM2Values = units.filter((u) => u.eurM2).map((u) => u.eurM2!);
  const avgEurM2 =
    eurM2Values.length > 0
      ? Math.round(eurM2Values.reduce((a, b) => a + b, 0) / eurM2Values.length)
      : 0;

  const yieldValues = units.filter((u) => u.yieldNet).map((u) => u.yieldNet!);
  const medianYield = yieldValues.length > 0 ? median(yieldValues) : undefined;

  const seismicClasses = units.filter((u) => u.riskClass).map((u) => u.riskClass!);
  const seismicClass = seismicClasses.length > 0 ? mode(seismicClasses) : undefined;

  const totalUnits = units.length;
  const availableUnits = units.filter((u) => u.stage === "in_sales").length;

  return {
    development,
    developer: development.developer,
    units,
    unitStats,
    minPrice,
    maxPrice,
    avgEurM2,
    totalUnits,
    availableUnits,
    medianYield,
    seismicClass,
    photos,
    amenities,
  };
}

// ========================================
// Helper functions
// ========================================

function computeUnitMix(units: any[]): UnitStats[] {
  const grouped = new Map<string, { count: number; prices: number[]; eurM2s: number[] }>();

  for (const unit of units) {
    const key = unit.typology;
    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, prices: [], eurM2s: [] });
    }
    const group = grouped.get(key)!;
    group.count++;
    group.prices.push(unit.priceEur);
    if (unit.eurM2) group.eurM2s.push(unit.eurM2);
  }

  return Array.from(grouped.entries()).map(([typology, data]) => ({
    typology,
    count: data.count,
    minPrice: Math.min(...data.prices),
    maxPrice: Math.max(...data.prices),
    avgEurM2:
      data.eurM2s.length > 0
        ? Math.round(data.eurM2s.reduce((a, b) => a + b, 0) / data.eurM2s.length)
        : 0,
  }));
}

function computeBadges(dev: any, units: any[]): string[] {
  const badges: string[] = [];

  // Green mortgage eligibility
  if (dev.deliveryAt && new Date(dev.deliveryAt) >= new Date("2021-01-01")) {
    badges.push("Green mortgage eligible");
  }

  // Low seismic
  const seismicClasses = units.filter((u) => u.riskClass).map((u) => u.riskClass);
  if (seismicClasses.some((c) => c === "A" || c === "B")) {
    badges.push("Low seismic");
  }

  // High yield
  const yields = units.filter((u) => u.yieldNet && u.yieldNet > 5);
  if (yields.length > units.length / 2) {
    badges.push("High yield");
  }

  // Delivery soon
  if (dev.deliveryAt) {
    const monthsUntil = Math.round(
      (new Date(dev.deliveryAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
    );
    if (monthsUntil <= 6 && monthsUntil > 0) {
      badges.push("Delivery soon");
    }
  }

  return badges;
}

function formatDeliveryQuarter(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

function formatAreaName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getOrderBy(sort: string): any {
  switch (sort) {
    case "price_asc":
      return { units: { _count: "asc" } }; // Proxy: fewer units = likely cheaper
    case "price_desc":
      return { units: { _count: "desc" } };
    case "delivery":
      return { deliveryAt: "asc" };
    case "relevance":
    default:
      return { createdAt: "desc" };
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let maxCount = 0;
  let modeValue = values[0];
  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      modeValue = value;
    }
  }
  return modeValue;
}
