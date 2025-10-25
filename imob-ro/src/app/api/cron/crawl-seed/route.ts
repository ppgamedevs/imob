/**
 * Day 32 - Crawl Seed with Sitemaps
 * Seeds ListingSources and discovers URLs from sitemaps for București
 */

import { pickAdapter } from "@/lib/crawl/adapters";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for sitemap processing

const MAX_URLS_PER_DAY = 2000;

export async function GET() {
  // Seed listing sources with real domains
  const sources = [
    { domain: "imobiliare.ro", sitemap: "https://www.imobiliare.ro/sitemap.xml" },
    { domain: "storia.ro", sitemap: "https://www.storia.ro/sitemap.xml" },
    { domain: "olx.ro", sitemap: "https://www.olx.ro/sitemap.xml" },
  ];

  for (const src of sources) {
    await prisma.listingSource
      .upsert({
        where: { domain: src.domain },
        update: { enabled: true },
        create: { domain: src.domain, enabled: true, minDelayMs: 2000 },
      })
      .catch(() => {});
  }

  // Discover URLs from sitemaps
  let totalDiscovered = 0;
  let totalEnqueued = 0;

  for (const src of sources) {
    if (totalEnqueued >= MAX_URLS_PER_DAY) break;

    try {
      const url = new URL(src.sitemap);
      const adapter = pickAdapter(url);

      // Discover from sitemap
      const result = await adapter.discover(url);
      totalDiscovered += result.links.length;

      // Enqueue up to limit, filtering for București
      for (const link of result.links) {
        if (totalEnqueued >= MAX_URLS_PER_DAY) break;

        // Filter for București (basic heuristic)
        const linkLower = link.toLowerCase();
        if (
          linkLower.includes("bucuresti") ||
          linkLower.includes("bucharest") ||
          linkLower.includes("/ilfov/")
        ) {
          try {
            const linkUrl = new URL(link);
            const normalized = linkUrl.toString();

            await prisma.crawlJob.create({
              data: {
                url: normalized,
                normalized,
                domain: linkUrl.hostname.replace(/^www\./, ""),
                kind: "detail",
                status: "queued",
                priority: 5,
              },
            });
            totalEnqueued++;
          } catch {
            // Ignore duplicates or invalid URLs
          }
        }
      }
    } catch (err) {
      console.error(`Failed to process ${src.domain}:`, err);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sources: sources.length,
      discovered: totalDiscovered,
      enqueued: totalEnqueued,
      limit: MAX_URLS_PER_DAY,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
