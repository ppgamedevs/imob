/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";
import type { AlertParams } from "@/types/alerts";

type Notif = { ruleId: string; userId: string; title: string; message: string; url?: string };

export async function checkAlertsNow(): Promise<Notif[]> {
  const rules = await (prisma as any).alertRule.findMany({ where: { isActive: true } });
  const out: Notif[] = [];

  for (const r of rules) {
    const p = (r.params ?? {}) as AlertParams;

    // PRICE_BELOW
    if (r.type === "PRICE_BELOW" && r.analysisId && p.thresholdEur != null) {
      const a = await prisma.analysis.findUnique({
        where: { id: r.analysisId },
        include: { extractedListing: true, featureSnapshot: true },
      });
      const price =
        (a?.featureSnapshot as any)?.features?.priceEur ?? a?.extractedListing?.price ?? null;
      if (price != null && price <= p.thresholdEur!) {
        out.push({
          ruleId: r.id,
          userId: r.userId,
          title: "Preț sub pragul setat",
          message: `Anunțul a ajuns la ${price} € (pragul tău: ${p.thresholdEur} €)`,
          url: `/report/${r.analysisId}`,
        });
      }
    }

    // UNDERPRICED
    if (r.type === "UNDERPRICED" && r.analysisId) {
      const sRaw = await prisma.scoreSnapshot.findUnique({ where: { analysisId: r.analysisId } });
      const s = sRaw as any;
      const badge = s?.priceBadge;
      const conf = s?.avmConf ?? 0;
      const need = p.underpricedPct ?? 0.05;
      const delta = (s?.explain as any)?.avm?.askingVsMid as number | null;
      const strong = badge === "Underpriced" && conf >= 0.5 && (delta == null || delta <= -need);
      if (strong) {
        out.push({
          ruleId: r.id,
          userId: r.userId,
          title: "Sub prețul pieței",
          message: `Raportul e "Underpriced" cu încredere ${(conf * 100).toFixed(0)}%.`,
          url: `/report/${r.analysisId}`,
        });
      }
    }

    // NEW_LISTINGS
    if (r.type === "NEW_LISTINGS" && r.areaSlug) {
      const today = await prisma.areaDaily.findFirst({
        where: { areaSlug: r.areaSlug },
        orderBy: { date: "desc" },
      });
      const prev = await prisma.areaDaily.findFirst({
        where: { areaSlug: r.areaSlug, date: { lt: today?.date ?? undefined } },
        orderBy: { date: "desc" },
      });
      const inc = (today?.supply ?? 0) - (prev?.supply ?? 0);
      if (inc > 0) {
        out.push({
          ruleId: r.id,
          userId: r.userId,
          title: "Anunțuri noi în zonă",
          message: `+${inc} anunțuri noi în ${r.areaSlug}`,
          url: `/discover?area=${encodeURIComponent(r.areaSlug)}`,
        });
      }
    }
  }

  return out;
}

export async function markFired(ruleId: string) {
  await (prisma as any).alertRule.update({
    where: { id: ruleId },
    data: { lastFiredAt: new Date() },
  });
}
