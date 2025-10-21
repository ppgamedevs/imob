import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { sleep } from "@/lib/crawl/helpers";
import { prisma } from "@/lib/db";
import { runExtractor } from "@/lib/extract/run";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";

// simplu: alege până la N joburi din domenii diferite
const CONCURRENCY = 3;

async function fetchHtml(url: string) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "ImobIntelBot/0.1 (+https://example.com/bot)" },
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html;
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  // select distinct domains queued
  const queued = await prisma.crawlJob.findMany({
    where: { status: "queued" },
    orderBy: { scheduledAt: "asc" },
    take: 50, // overfetch, we'll pick distinct domains
  });

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const byDomain = new Map<string, any>();
  for (const j of queued) {
    if (!byDomain.has(j.domain)) byDomain.set(j.domain, j);
    if (byDomain.size >= CONCURRENCY) break;
  }
  const pick = Array.from(byDomain.values());
  if (!pick.length) return NextResponse.json({ ok: true, taken: 0 });

  // mark as fetching
  await prisma.crawlJob.updateMany({
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    where: { id: { in: pick.map((j: any) => j.id) } },
    data: { status: "fetching" },
  });

  let done = 0;
  for (const job of pick) {
    try {
      const html = await fetchHtml(job.url);
      const ext = await runExtractor(html, job.url);

      // upsert Analysis
      const norm = normalizeUrl(job.url) ?? job.url;
      let a = await prisma.analysis.findFirst({
        where: { sourceUrl: norm },
      });
      if (!a) {
        a = await prisma.analysis.create({
          data: { sourceUrl: norm, status: "queued" },
        });
      }

      // store extracted data with all available fields
      await prisma.extractedListing.upsert({
        where: { analysisId: a.id },
        update: {
          title: ext.title || undefined,
          price: ext.price || undefined,
          currency: ext.currency || undefined,
          areaM2: ext.areaM2 || undefined,
          rooms: ext.rooms || undefined,
          floorRaw: ext.floorRaw || undefined,
          yearBuilt: ext.yearBuilt || undefined,
          lat: ext.lat || undefined,
          lng: ext.lng || undefined,
          addressRaw: ext.addressRaw || undefined,
          photos: ext.photos?.length ? ext.photos : undefined,
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          sourceMeta: { ...ext.sourceMeta, source: "crawler" } as any,
        },
        create: {
          analysisId: a.id,
          title: ext.title || undefined,
          price: ext.price || undefined,
          currency: ext.currency || undefined,
          areaM2: ext.areaM2 || undefined,
          rooms: ext.rooms || undefined,
          floorRaw: ext.floorRaw || undefined,
          yearBuilt: ext.yearBuilt || undefined,
          lat: ext.lat || undefined,
          lng: ext.lng || undefined,
          addressRaw: ext.addressRaw || undefined,
          photos: ext.photos?.length ? ext.photos : undefined,
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          sourceMeta: { ...ext.sourceMeta, source: "crawler" } as any,
        },
      });

      // kick pipeline
      // (poți să-l rulezi fire-and-forget; aici doar îl apelăm simplu)
      await startAnalysis(a.id, norm);

      await prisma.crawlJob.update({
        where: { id: job.id },
        data: { status: "done", analysisId: a.id },
      });
      done++;
      await sleep(500); // mică pauză între joburi
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (e: any) {
      const tries = job.tries + 1;
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: {
          status: tries >= 3 ? "error" : "queued",
          tries,
          lastError: String(e?.message ?? e),
          scheduledAt: new Date(Date.now() + 1000 * 60 * (tries * 5)), // backoff
        },
      });
    }
  }

  return NextResponse.json({ ok: true, taken: pick.length, done });
}
