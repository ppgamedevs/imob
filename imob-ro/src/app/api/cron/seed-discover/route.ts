/**
 * GET /api/cron/seed-discover
 * Enqueues discover jobs for apartment listing pages across all supported sources.
 * Re-queues existing discover jobs that were already processed (older than 4h).
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { withCronTracking } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";
export const maxDuration = 30;

const DISCOVER_URLS = [
  // Imobiliare.ro - garsoniere
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=4",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=5",
  // Imobiliare.ro - 2 camere
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=4",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=5",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=6",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=7",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=8",
  // Imobiliare.ro - 3 camere
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti?pagina=4",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti?pagina=5",
  // Imobiliare.ro - 4+ camere
  "https://www.imobiliare.ro/vanzare-apartamente-4-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-4-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-4-camere/bucuresti?pagina=3",
  // Storia.ro
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=2",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=3",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=4",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=5",
  // OLX
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/?page=2",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/?page=3",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/?page=4",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/?page=5",
  // Publi24
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/",
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/?pag=2",
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/?pag=3",
  // LaJumate
  "https://www.lajumate.ro/apartamente-de-vanzare/bucuresti-ilfov/",
  "https://www.lajumate.ro/apartamente-de-vanzare/bucuresti-ilfov/?page=2",
  // Homezz
  "https://homezz.ro/vanzare-apartamente/bucuresti-if",
  "https://homezz.ro/vanzare-apartamente/bucuresti-if?pagina=2",
  "https://homezz.ro/vanzare-apartamente/bucuresti-if?pagina=3",
];

const DOMAINS = [
  "imobiliare.ro",
  "storia.ro",
  "olx.ro",
  "publi24.ro",
  "lajumate.ro",
  "homezz.ro",
];

const REQUEUE_AFTER_MS = 4 * 60 * 60 * 1000; // 4 hours

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
  let requeued = 0;
  let skipped = 0;

  for (const url of DISCOVER_URLS) {
    try {
      const linkUrl = new URL(url);
      const normalized = linkUrl.toString();
      const domain = linkUrl.hostname.replace(/^www\./, "");

      // Try to create new job
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
      // Already exists - re-queue if old enough
      try {
        const existing = await prisma.crawlJob.findUnique({
          where: { normalized: new URL(url).toString() },
        });
        if (
          existing &&
          existing.status !== "queued" &&
          existing.status !== "running" &&
          existing.updatedAt.getTime() < Date.now() - REQUEUE_AFTER_MS
        ) {
          await prisma.crawlJob.update({
            where: { id: existing.id },
            data: { status: "queued", tries: 0, lastError: null, lockedAt: null },
          });
          requeued++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    requeued,
    skipped,
    total: DISCOVER_URLS.length,
    message: "Run /api/cron/crawl-tick to process the queue.",
  });
});
