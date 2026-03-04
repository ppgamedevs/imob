/**
 * Day 32: Crawl Runner with Content Hash Change Detection
 * Takes batch from queue, fetches, extracts, and pushes to analysis pipeline
 */

import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { pickAdapter } from "@/lib/crawl/adapters";
import { fetchWithCache } from "@/lib/crawl/fetcher";
import { sleep } from "@/lib/crawl/helpers";
import { hasContentChanged, hashContent, markDone, takeBatch } from "@/lib/crawl/queue";
import { prisma } from "@/lib/db";
import { createListingSnapshot } from "@/lib/integrity/snapshot";
import { withCronTracking } from "@/lib/obs/cron-tracker";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 25;

export const GET = withCronTracking("crawl-tick", async (_req) => {
  // Take batch with domain diversity
  const batch = await takeBatch(BATCH_SIZE);

  if (!batch.length) {
    return NextResponse.json({ ok: true, processed: 0, message: "No jobs in queue" });
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  let discovered = 0;

  for (const job of batch) {
    try {
      const url = new URL(job.url);
      const adapter = pickAdapter(url);

      // Handle discover jobs: find listing URLs and enqueue them
      if (job.kind === "discover") {
        const result = await adapter.discover(url);
        let enqueued = 0;
        for (const link of result.links) {
          try {
            const linkUrl = new URL(link);
            const norm = linkUrl.toString();
            await prisma.crawlJob.create({
              data: {
                url: link,
                normalized: norm,
                domain: linkUrl.hostname.replace(/^www\./, ""),
                kind: "detail",
                status: "queued",
                priority: 5,
              },
            });
            enqueued++;
          } catch {
            // duplicate or invalid URL
          }
        }
        discovered += enqueued;

        // Enqueue next page if available
        if (result.next) {
          try {
            const nextUrl = new URL(result.next);
            await prisma.crawlJob.create({
              data: {
                url: result.next,
                normalized: nextUrl.toString(),
                domain: nextUrl.hostname.replace(/^www\./, ""),
                kind: "discover",
                status: "queued",
                priority: 3,
              },
            });
          } catch { /* duplicate */ }
        }

        await markDone({ id: job.id, status: "done" });
        processed++;
        await sleep(2000);
        continue;
      }

      // Detail jobs: fetch, extract, analyze
      const { status, html } = await fetchWithCache(url);

      if (status === 304 || !html) {
        await markDone({ id: job.id, status: "done" });
        skipped++;
        continue;
      }

      const newHash = hashContent(html);
      const changed = await hasContentChanged(job.normalized, newHash);
      if (!changed) {
        await markDone({ id: job.id, status: "done", contentHash: newHash });
        skipped++;
        continue;
      }

      const result = await adapter.extract({ url, html });
      const ext = result.extracted;

      if (!ext.title && !ext.price) {
        await markDone({
          id: job.id,
          status: "error",
          error: "No data extracted",
          contentHash: newHash,
        });
        errors++;
        continue;
      }

      const norm = normalizeUrl(job.url) ?? job.url;
      let analysis = await prisma.analysis.findFirst({
        where: { sourceUrl: norm },
      });

      if (!analysis) {
        analysis = await prisma.analysis.create({
          data: {
            sourceUrl: norm,
            canonicalUrl: norm,
            status: "queued",
          },
        });
      }

      await prisma.extractedListing.upsert({
        where: { analysisId: analysis.id },
        update: {
          title: ext.title,
          price: ext.price,
          currency: ext.currency,
          areaM2: ext.areaM2,
          rooms: ext.rooms,
          floorRaw: ext.floorRaw,
          yearBuilt: ext.yearBuilt,
          lat: ext.lat,
          lng: ext.lng,
          addressRaw: ext.addressRaw,
          photos: ext.photos?.length ? ext.photos : undefined,
          sourceMeta: { ...ext.sourceMeta, crawlerV2: true } as any,
        },
        create: {
          analysisId: analysis.id,
          title: ext.title,
          price: ext.price,
          currency: ext.currency,
          areaM2: ext.areaM2,
          rooms: ext.rooms,
          floorRaw: ext.floorRaw,
          yearBuilt: ext.yearBuilt,
          lat: ext.lat,
          lng: ext.lng,
          addressRaw: ext.addressRaw,
          photos: ext.photos?.length ? ext.photos : undefined,
          sourceMeta: { ...ext.sourceMeta, crawlerV2: true } as any,
        },
      });

      await startAnalysis(analysis.id, norm);

      // Create integrity snapshot (non-blocking)
      const desc = (ext.sourceMeta as Record<string, unknown>)?.description as string | undefined;
      createListingSnapshot({
        analysisId: analysis.id,
        title: ext.title,
        description: desc ?? null,
        priceEur: ext.price,
        photos: ext.photos as string[] | undefined,
        source: new URL(job.url).hostname.replace(/^www\./, ""),
        url: job.url,
        status: "ACTIVE",
      }).catch(() => {});

      await markDone({
        id: job.id,
        status: "done",
        contentHash: newHash,
        analysisId: analysis.id,
      });

      processed++;
      await sleep(1000);
    } catch (err) {
      console.error(`Failed to process ${job.url}:`, err);
      await markDone({
        id: job.id,
        status: "error",
        error: String(err),
      });
      errors++;
    }
  }

  // Self-chain: if there are more jobs in queue, trigger another tick
  const remaining = await prisma.crawlJob.count({
    where: { status: "queued" },
  });

  if (remaining > 0) {
    scheduleNextTick().catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    batch: batch.length,
    processed,
    skipped,
    errors,
    discovered,
    remaining,
  });
});

async function scheduleNextTick() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  if (!baseUrl) return;
  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {};
  if (secret) headers["authorization"] = `Bearer ${secret}`;

  try {
    await fetch(`${baseUrl}/api/cron/crawl-tick`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort self-chain
  }
}
