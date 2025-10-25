// Bulk analysis queue system

import { startAnalysis } from "@/lib/analysis";
import { prisma } from "@/lib/db";

import { assertOrgQuota } from "./quotas";

const CONCURRENT_LIMIT = 30;

export async function queueBulkAnalysis(
  urls: string[],
  agentEmail: string,
  orgId: string | null,
): Promise<string> {
  // Check quotas first
  await assertOrgQuota(agentEmail);

  // Normalize URLs
  const normalized = urls
    .map((url) => normalizeUrl(url))
    .filter((url): url is string => url !== null);

  // Create job
  const job = await prisma.bulkAnalysisJob.create({
    data: {
      agentEmail,
      orgId,
      total: normalized.length,
      queued: normalized.length,
      status: "queued",
    },
  });

  // Check for existing analyses to avoid duplicates
  const existing = await prisma.analysis.findMany({
    where: {
      sourceUrl: {
        in: normalized,
      },
    },
    select: { sourceUrl: true, id: true },
  });

  const existingMap = new Map(existing.map((a) => [a.sourceUrl, a.id]));

  // Create items
  const items = await Promise.all(
    normalized.map((url) => {
      const existingId = existingMap.get(url);
      return prisma.bulkAnalysisItem.create({
        data: {
          jobId: job.id,
          url,
          status: existingId ? "done" : "queued",
          analysisId: existingId || null,
        },
      });
    }),
  );

  // Update job stats for duplicates
  const duplicateCount = items.filter((i) => i.status === "done").length;
  if (duplicateCount > 0) {
    await prisma.bulkAnalysisJob.update({
      where: { id: job.id },
      data: {
        done: duplicateCount,
        queued: normalized.length - duplicateCount,
      },
    });
  }

  // Start processing (async, don't await)
  processBulkJob(job.id).catch((err) => {
    console.error(`Error processing job ${job.id}:`, err);
  });

  return job.id;
}

async function processBulkJob(jobId: string): Promise<void> {
  // Update job status
  await prisma.bulkAnalysisJob.update({
    where: { id: jobId },
    data: { status: "running" },
  });

  let running = 0;
  let hasMore = true;

  while (hasMore) {
    // Get next batch of queued items
    const items = await prisma.bulkAnalysisItem.findMany({
      where: {
        jobId,
        status: "queued",
      },
      take: CONCURRENT_LIMIT - running,
      orderBy: { createdAt: "asc" },
    });

    if (items.length === 0) {
      // Check if any still running
      const runningCount = await prisma.bulkAnalysisItem.count({
        where: {
          jobId,
          status: "running",
        },
      });

      if (runningCount === 0) {
        hasMore = false;
        break;
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    // Process items in parallel
    const promises = items.map((item) => processItem(item.id, item.url));
    running += items.length;

    // Wait for at least one to complete
    await Promise.race([...promises, new Promise((resolve) => setTimeout(resolve, 5000))]);

    // Update running count
    const stillRunning = await prisma.bulkAnalysisItem.count({
      where: {
        jobId,
        status: "running",
      },
    });
    running = stillRunning;
  }

  // Mark job as completed
  const finalStats = await prisma.bulkAnalysisItem.groupBy({
    by: ["status"],
    where: { jobId },
    _count: true,
  });

  const stats = {
    queued: 0,
    running: 0,
    done: 0,
    failed: 0,
  };

  finalStats.forEach((s) => {
    if (s.status in stats) {
      stats[s.status as keyof typeof stats] = s._count;
    }
  });

  await prisma.bulkAnalysisJob.update({
    where: { id: jobId },
    data: {
      ...stats,
      status: "completed",
    },
  });
}

async function processItem(itemId: string, url: string): Promise<void> {
  try {
    // Mark as running
    await prisma.bulkAnalysisItem.update({
      where: { id: itemId },
      data: { status: "running" },
    });

    // Create analysis
    const analysis = await prisma.analysis.create({
      data: {
        sourceUrl: url,
        status: "queued",
      },
    });

    // Start analysis
    await startAnalysis(analysis.id, url);

    // Mark as done
    await prisma.bulkAnalysisItem.update({
      where: { id: itemId },
      data: {
        status: "done",
        analysisId: analysis.id,
      },
    });
  } catch (error) {
    console.error(`Error processing item ${itemId}:`, error);
    await prisma.bulkAnalysisItem.update({
      where: { id: itemId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

function normalizeUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Add protocol if missing
    let fullUrl = trimmed;
    if (!trimmed.match(/^https?:\/\//)) {
      fullUrl = `https://${trimmed}`;
    }

    const parsed = new URL(fullUrl);
    return parsed.href;
  } catch {
    return null;
  }
}

export async function getBulkJobStatus(jobId: string) {
  const job = await prisma.bulkAnalysisJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        take: 100, // Limit for UI performance
      },
    },
  });

  return job;
}
