/**
 * Day 25 - Crawl Seed
 * Seeds ListingSources and initial discover jobs for București
 */

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  // Seed listing sources (add real domains when ready)
  const domains = [
    "example1.ro", // TODO: Replace with real domains
    "example2.ro", // e.g., "olx.ro", "imobiliare.ro", etc.
  ];

  for (const d of domains) {
    await prisma.listingSource
      .upsert({
        where: { domain: d },
        update: { enabled: true },
        create: { domain: d, enabled: true, minDelayMs: 2000 },
      })
      .catch(() => {});
  }

  // Seed initial discover page URLs for București
  const seeds = [
    "https://example1.ro/bucuresti?page=1",
    "https://example2.ro/bucuresti?page=1",
    // TODO: Add real listing page URLs for București
  ];

  let seeded = 0;
  for (const url of seeds) {
    try {
      const u = new URL(url);
      const normalized = u.toString();

      await prisma.crawlJob.create({
        data: {
          url: normalized,
          normalized,
          domain: u.hostname.replace(/^www\./, ""),
          kind: "discover",
          status: "queued",
          priority: 10, // High priority for seed jobs
        },
      });
      seeded++;
    } catch {
      // Ignore duplicates or invalid URLs
    }
  }

  return new Response(JSON.stringify({ ok: true, domains: domains.length, seeded }), {
    headers: { "Content-Type": "application/json" },
  });
}
