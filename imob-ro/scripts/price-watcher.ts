#!/usr/bin/env ts-node
/*
  Daily price watcher script
  - Scans recent analyses with sourceUrl
  - Fetches the page and extracts a price (simple heuristics)
  - Inserts a PriceHistory row when price changes
  - Updates AreaDaily.medianEurM2 (simple median of recent listings in area)
*/
import "dotenv/config";

import { prisma } from "../src/lib/db";
import { getParserForUrl } from "../src/lib/price/parsers";

function parsePriceFromHtml(html: string): number | null {
  // find common euro price patterns like "€ 123.456" or "123.456 €" or "123.456 EUR"
  const currencyRegex = /(?:€|EUR|eur|Lei|RON|lei)\s?([0-9][0-9 .,_]{2,})/g;
  let match: RegExpExecArray | null;
  while ((match = currencyRegex.exec(html))) {
    const raw = match[1];
    const cleaned = raw.replace(/[ ,_.]/g, "");
    const n = parseInt(cleaned, 10);
    if (!Number.isNaN(n) && n > 100) return n; // return first reasonable number
  }
  // fallback: any 4+ digit number
  const fallback = html.match(/([0-9]{4,})/);
  if (fallback) return parseInt(fallback[1].replace(/[^0-9]/g, ""), 10);
  return null;
}

async function updateAreaDaily(areaSlug: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  // Pull feature snapshots joined to extracted listings
  const snaps = await prisma.featureSnapshot.findMany({
    where: {},
    include: { analysis: { include: { extractedListing: true } } },
    take: 2000,
  });

  const rows: number[] = [];
  for (const s of snaps) {
    try {
      const f = s.features as unknown as Record<string, unknown> | null;
      if (!f || String(f.area_slug) !== String(areaSlug)) continue;
      const listing = s.analysis?.extractedListing;
      if (!listing) continue;
      const price = listing.price;
      const areaM2 = listing.areaM2 ?? null;
      if (typeof price === "number" && typeof areaM2 === "number" && areaM2 > 0) {
        rows.push(Math.round(price / areaM2));
      }
    } catch {
      // skip
    }
  }

  if (!rows.length) return;
  rows.sort((a, b) => a - b);
  const mid = Math.floor(rows.length / 2);
  const median = rows.length % 2 === 1 ? rows[mid] : Math.round((rows[mid - 1] + rows[mid]) / 2);
  const supply = rows.length;
  const demandScore = Math.max(0, Math.min(1, 1 - supply / 20));

  const today = new Date();
  const dateOnly = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  await prisma.areaDaily.upsert({
    where: { areaSlug_date: { areaSlug, date: dateOnly } },
    create: { areaSlug, date: dateOnly, medianEurM2: median, supply, demandScore },
    update: { medianEurM2: median, supply, demandScore },
  });
}

async function run() {
  console.log("Starting price watcher...");

  const analyses = await prisma.analysis.findMany({
    where: { sourceUrl: { not: undefined } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  for (const a of analyses) {
    const url = a.sourceUrl;
    if (!url) continue;
    try {
      const res = await fetch(url, { redirect: "follow" });
      const text = await res.text();
      const parser = getParserForUrl(url);
      const parsed = parser(text, url);
      let price = parsed?.price ?? null;
      if (price == null) {
        // fallback heuristic
        price = parsePriceFromHtml(text);
      }
      if (price == null) continue;

      const last = await prisma.priceHistory.findFirst({
        where: { sourceUrl: url },
        orderBy: { ts: "desc" },
      });

      if (!last || last.price !== price) {
        await prisma.priceHistory.create({
          data: { sourceUrl: url, ts: new Date(), price, currency: "EUR" },
        });
        console.log(`Inserted price ${price} for ${url}`);
      }

      // update area daily if area present
      try {
        const fsnap = await prisma.featureSnapshot.findUnique({ where: { analysisId: a.id } });
        const f = (fsnap?.features ?? null) as unknown;
        const getProp = (obj: unknown, key: string) => {
          if (!obj || typeof obj !== "object") return undefined;
          return (obj as Record<string, unknown>)[key];
        };
        const areaSlugVal = getProp(f, "area_slug");
        if (typeof areaSlugVal !== "undefined") await updateAreaDaily(String(areaSlugVal));
      } catch {
        // ignore per-analysis area update errors
      }
    } catch {
      // log generic failure, message may be non-serializable
      console.warn("failed to fetch", url);
    }
  }

  console.log("Price watcher finished.");
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
