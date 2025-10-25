// Step 11: Development analytics tracking

import { prisma } from "@/lib/db";
import type { DevelopmentEvent } from "@/types/development";

/**
 * Track development-related events
 * Can be called from server or client components
 */
export async function trackDevelopmentEvent(event: DevelopmentEvent): Promise<void> {
  try {
    // For now, we'll reuse the BuyerEvent table since it's generic
    // In production, you might want a dedicated DevelopmentEvent table
    await prisma.buyerEvent.create({
      data: {
        userId: "", // Anonymous for public catalog
        kind: event.kind,
        meta: {
          ...event,
          timestamp: new Date().toISOString(),
        } as any,
      },
    });
  } catch (error) {
    console.error("[analytics] Failed to track event:", error);
    // Don't throw - analytics should never break the app
  }
}

/**
 * Track catalog view (call on page load)
 */
export async function trackCatalogView(filters?: any): Promise<void> {
  await trackDevelopmentEvent({
    kind: "dev_catalog_view",
    filters,
  });
}

/**
 * Track filter application
 */
export async function trackFilterApply(filters: any): Promise<void> {
  await trackDevelopmentEvent({
    kind: "dev_catalog_filter",
    filters,
  });
}

/**
 * Track project card click
 */
export async function trackProjectClick(developmentId: string, sponsored: boolean): Promise<void> {
  await trackDevelopmentEvent({
    kind: sponsored ? "dev_sponsored_click" : "dev_card_click",
    developmentId,
  });
}

/**
 * Track project page view
 */
export async function trackProjectView(developmentId: string): Promise<void> {
  await trackDevelopmentEvent({
    kind: "dev_project_view",
    developmentId,
  });
}

/**
 * Track unit filter change
 */
export async function trackUnitFilter(developmentId: string, filters: any): Promise<void> {
  await trackDevelopmentEvent({
    kind: "dev_unit_filter",
    developmentId,
    filters,
  });
}

/**
 * Track unit row click (contact button)
 */
export async function trackUnitRowClick(developmentId: string, unitId: string): Promise<void> {
  await trackDevelopmentEvent({
    kind: "dev_unit_row_click",
    developmentId,
    unitId,
  });
}

/**
 * Track lead submission
 */
export async function trackLeadSubmit(
  developmentId: string,
  unitId: string | undefined,
  success: boolean,
): Promise<void> {
  await trackDevelopmentEvent({
    kind: success ? "dev_lead_submit" : "dev_lead_blocked",
    developmentId,
    unitId,
  });
}

/**
 * Track brochure download
 */
export async function trackBrochureDownload(developmentId: string): Promise<void> {
  await trackDevelopmentEvent({
    kind: "dev_brochure_download",
    developmentId,
  });
}

/**
 * Get analytics summary for a development
 */
export async function getDevelopmentAnalytics(developmentId: string): Promise<{
  views: number;
  leads: number;
  unitClicks: number;
  brochureDownloads: number;
}> {
  const events = await prisma.buyerEvent.findMany({
    where: {
      kind: {
        in: ["dev_project_view", "dev_lead_submit", "dev_unit_row_click", "dev_brochure_download"],
      },
      meta: {
        path: ["developmentId"],
        equals: developmentId,
      },
    },
    select: {
      kind: true,
    },
  });

  const summary = {
    views: 0,
    leads: 0,
    unitClicks: 0,
    brochureDownloads: 0,
  };

  for (const event of events) {
    if (event.kind === "dev_project_view") summary.views++;
    if (event.kind === "dev_lead_submit") summary.leads++;
    if (event.kind === "dev_unit_row_click") summary.unitClicks++;
    if (event.kind === "dev_brochure_download") summary.brochureDownloads++;
  }

  return summary;
}
