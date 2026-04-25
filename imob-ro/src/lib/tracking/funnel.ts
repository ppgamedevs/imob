import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";
import { redactSensitiveUrlParams } from "@/lib/url/sensitive-query";

export const FUNNEL_EVENT_NAMES = [
  "homepage_view",
  "analyze_form_submit",
  "analysis_started",
  "analysis_failed",
  "site_support_interest",
  "report_preview_viewed",
  "unlock_cta_clicked",
  "checkout_started",
  "checkout_completed",
  "report_unlocked_viewed",
  "report_unlock_success_banner_viewed",
  "report_unlock_pending_after_success_redirect",
  "report_paid_unlock_suppressed",
  "pdf_download_clicked",
  "pdf_download_completed",
  "paid_report_feedback_submitted",
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

const NAME_SET = new Set<string>(FUNNEL_EVENT_NAMES);

export function isFunnelEventName(name: string): name is FunnelEventName {
  return NAME_SET.has(name);
}

export type TrackFunnelEventInput = {
  analysisId?: string | null;
  userId?: string | null;
  anonymousId?: string | null;
  /** If omitted and analysisId is set, filled from Analysis.sourceUrl. */
  sourceUrl?: string | null;
  path: string;
  referrer?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  input: TrackFunnelEventInput,
): Promise<void> {
  try {
    let sourceUrl = input.sourceUrl ?? null;
    if (input.analysisId && !sourceUrl) {
      const row = await prisma.analysis.findUnique({
        where: { id: input.analysisId },
        select: { sourceUrl: true },
      });
      sourceUrl = row?.sourceUrl ?? null;
    }

    await prisma.funnelEvent.create({
      data: {
        eventName,
        analysisId: input.analysisId ?? null,
        userId: input.userId ?? null,
        anonymousId: input.anonymousId ?? null,
        sourceUrl: sourceUrl ? truncateSourceUrl(redactSensitiveUrlParams(sourceUrl)) : null,
        path: clampPath(redactSensitiveUrlParams(input.path)),
        referrer:
          input.referrer != null
            ? truncateText(redactSensitiveUrlParams(input.referrer), 2000)
            : null,
        metadata: jsonMeta(sanitizeFunnelMetadata(input.metadata)),
      },
    });
  } catch (e) {
    logger.warn({ e, eventName }, "FunnelEvent insert failed");
  }
}

function clampPath(path: string): string {
  const p = path.trim() || "/";
  return p.length > 500 ? p.slice(0, 500) : p;
}

function truncateSourceUrl(url: string): string {
  return truncateText(url, 2000);
}

function truncateText(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function sanitizeFunnelMetadata(meta: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (meta == null) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k.length > 80) continue;
    if (v == null) {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      out[k] = v.length > 2000 ? v.slice(0, 2000) : v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === "boolean") {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

function jsonMeta(meta: Record<string, unknown> | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (meta == null) return Prisma.JsonNull;
  return meta as Prisma.InputJsonValue;
}
