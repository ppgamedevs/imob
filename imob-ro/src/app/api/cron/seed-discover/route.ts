/**
 * GET /api/cron/seed-discover
 * Enqueues discover jobs for Bucharest apartment listing pages (same as scripts/seed-urls.ts).
 * Call with: Authorization: Bearer <CRON_SECRET>
 * No need to run the script inside the container.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { withCronTracking } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";
export const maxDuration = 30;

const DISCOVER_URLS = [
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-4-camere/bucuresti",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=2",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=3",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/?page=2",
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/",
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/?pag=2",
  "https://www.lajumate.ro/vanzari-apartamente/bucuresti/",
  "https://homezz.ro/vanzare-apartamente/bucuresti-if",
  "https://homezz.ro/vanzare-apartamente/bucuresti-if?pagina=2",
];

const DOMAINS = [
  "imobiliare.ro",
  "storia.ro",
  "olx.ro",
  "publi24.ro",
  "lajumate.ro",
  "homezz.ro",
];

export const GET = withCronTracking("seed-discover", async () => {
  for (const domain of DOMAINS) {
    await prisma.listingSource
      .upsert({
        where: { domain },
        update: { enabled: true },
        create: { domain, enabled: true, minDelayMs: 2000 },
      })
      .catch(() => {});
  }

  let created = 0;
  let skipped = 0;

  for (const url of DISCOVER_URLS) {
    try {
      const linkUrl = new URL(url);
      const normalized = linkUrl.toString();
      const domain = linkUrl.hostname.replace(/^www\./, "");

      await prisma.crawlJob.create({
        data: {
          url,
          normalized,
          domain,
          kind: "discover",
          status: "queued",
          priority: 20,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    total: DISCOVER_URLS.length,
    message: "Run /api/cron/crawl-tick to process the queue.",
  });
});
