/**
 * Day 32: Crawl Runner with Content Hash Change Detection
 * Takes batch from queue, fetches, extracts, and pushes to analysis pipeline
 */

import { NextResponse } from "next/server";
import { startAnalysis } from "@/lib/analysis";
import { sleep } from "@/lib/crawl/helpers";
import { prisma } from "@/lib/db";
import { pickAdapter } from "@/lib/crawl/adapters";
import { takeBatch, markDone, hashContent, hasContentChanged } from "@/lib/crawl/queue";
import { fetchWithCache } from "@/lib/crawl/fetcher";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 25;

export async function GET() {
  // Take batch with domain diversity
  const batch = await takeBatch(BATCH_SIZE);

  if (!batch.length) {
    return NextResponse.json({ ok: true, processed: 0, message: "No jobs in queue" });
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const job of batch) {
    try {
      // Fetch HTML with caching
      const url = new URL(job.url);
      const { status, html } = await fetchWithCache(url);

      // Handle 304 Not Modified
      if (status === 304 || !html) {
        await markDone({ id: job.id, status: "done" });
        skipped++;
        continue;
      }

      // Calculate content hash
      const newHash = hashContent(html);

      // Check if content changed since last crawl
      const changed = await hasContentChanged(job.normalized, newHash);
      if (!changed) {
        await markDone({ id: job.id, status: "done", contentHash: newHash });
        skipped++;
        continue;
      }

      // Extract structured data using adapter
      const adapter = pickAdapter(url);
      const result = await adapter.extract({ url, html });
      const ext = result.extracted;

      // Skip if no meaningful data extracted
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

      // Find or create Analysis record
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

      // Upsert ExtractedListing with all fields
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

      // Trigger analysis pipeline (normalize → score)
      await startAnalysis(analysis.id);

      // Mark job as done
      await markDone({
        id: job.id,
        status: "done",
        contentHash: newHash,
        analysisId: analysis.id,
      });

      processed++;

      // Respect rate limits between requests
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

  return NextResponse.json({
    ok: true,
    batch: batch.length,
    processed,
    skipped,
    errors,
  });
}
