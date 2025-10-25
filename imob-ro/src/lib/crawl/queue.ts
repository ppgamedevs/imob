/**
 * Day 32: Queue Utilities
 * Content hashing and batch processing for crawl queue
 */

import { createHash } from "crypto";

import { prisma } from "@/lib/db";

/**
 * Calculate SHA-256 hash of content for change detection
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Enqueue a URL for crawling with deduplication
 */
export async function enqueueUrl(opts: {
  url: string;
  source: string;
  kind?: "discover" | "detail";
  priority?: number;
}) {
  try {
    const u = new URL(opts.url);
    const normalized = u.toString();
    const domain = u.hostname.replace(/^www\./, "");

    await prisma.crawlJob.create({
      data: {
        url: opts.url,
        normalized,
        domain,
        kind: opts.kind || "detail",
        status: "queued",
        priority: opts.priority || 0,
      },
    });
    return { ok: true };
  } catch (err) {
    // Likely duplicate (unique constraint on normalized)
    return { ok: false, error: String(err) };
  }
}

/**
 * Take a batch of jobs from queue
 * Prioritizes by domain diversity to avoid hammering one site
 */
export async function takeBatch(n: number) {
  const queued = await prisma.crawlJob.findMany({
    where: { status: "queued" },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: n * 3, // Overfetch to ensure domain diversity
  });

  // Pick distinct domains
  const byDomain = new Map<string, (typeof queued)[0]>();
  for (const j of queued) {
    if (!byDomain.has(j.domain)) {
      byDomain.set(j.domain, j);
    }
    if (byDomain.size >= n) break;
  }

  const batch = Array.from(byDomain.values());

  // Mark as fetching
  if (batch.length > 0) {
    await prisma.crawlJob.updateMany({
      where: { id: { in: batch.map((j) => j.id) } },
      data: { status: "fetching", lockedAt: new Date() },
    });
  }

  return batch;
}

/**
 * Mark a job as done with optional contentHash
 */
export async function markDone(opts: {
  id: string;
  status: "done" | "error";
  error?: string;
  contentHash?: string;
  analysisId?: string;
}) {
  await prisma.crawlJob.update({
    where: { id: opts.id },
    data: {
      status: opts.status,
      lastError: opts.error,
      contentHash: opts.contentHash,
      analysisId: opts.analysisId,
      doneAt: new Date(),
      tries: { increment: 1 },
    },
  });
}

/**
 * Check if content has changed since last crawl
 */
export async function hasContentChanged(normalized: string, newHash: string): Promise<boolean> {
  const existing = await prisma.crawlJob.findUnique({
    where: { normalized },
    select: { contentHash: true },
  });

  return !existing || existing.contentHash !== newHash;
}
