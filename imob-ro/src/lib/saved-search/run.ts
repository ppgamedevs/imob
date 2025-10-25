/**
 * Day 29: Saved Search Runner
 * Executes saved searches using Discover logic + budget filtering
 */

import { prisma } from "@/lib/db";
import { discoverSearch } from "@/lib/discover/search";
import { mortgageCalc } from "@/lib/finance/mortgage";

import { SavedQuerySchema, type SavedQueryValidated } from "./validate";

export async function runSavedSearch(userId: string, queryJson: any) {
  const q = SavedQuerySchema.parse(queryJson) as SavedQueryValidated;

  // Convert SavedQuery to URLSearchParams for discoverSearch
  const params = new URLSearchParams();

  if (q.areas?.length) params.set("areas", q.areas.join(","));
  if (q.city) params.set("city", q.city);
  if (q.priceMin) params.set("priceMin", q.priceMin.toString());
  if (q.priceMax) params.set("priceMax", q.priceMax.toString());
  if (q.eurM2Min) params.set("eurM2Min", q.eurM2Min.toString());
  if (q.eurM2Max) params.set("eurM2Max", q.eurM2Max.toString());
  if (q.m2Min) params.set("m2Min", q.m2Min.toString());
  if (q.m2Max) params.set("m2Max", q.m2Max.toString());
  if (q.rooms?.length) params.set("rooms", q.rooms.join(","));
  if (q.yearMin) params.set("yearMin", q.yearMin.toString());
  if (q.yearMax) params.set("yearMax", q.yearMax.toString());
  if (q.metroMaxM) params.set("metroMaxM", q.metroMaxM.toString());
  if (q.underpriced) params.set("underpriced", "true");
  if (q.tts) params.set("tts", q.tts);
  if (q.keywords?.length) params.set("keywords", q.keywords.join(","));
  if (q.sort) params.set("sort", q.sort);
  if (q.dedup !== false) params.set("dedup", "true");

  const limit = Math.min(q.limit ?? 50, 200);
  params.set("limit", limit.toString());

  // Run search via Discover
  const res = await discoverSearch(params);

  // Apply budget filter if specified
  let items = res.items || [];
  if (q.budget && items.length > 0) {
    items = items.filter((item) => {
      if (!item.priceEur) return true; // skip if no price

      const calc = mortgageCalc({
        price: item.priceEur,
        downPct: q.budget?.mortgage?.downPct ?? 0.15,
        ratePct: q.budget?.mortgage?.maxRate ? q.budget.mortgage.maxRate * 100 : 7,
        years: 30,
        incomeNet: q.budget?.cash ?? undefined,
        dtiMax: 0.4,
      });

      return calc.ok;
    });
  }

  // Log event
  await prisma.buyerEvent.create({
    data: {
      userId,
      kind: "saved_search_run",
      meta: { results: items.length } as any,
    },
  });

  return {
    ...res,
    items,
    total: items.length,
  };
}
