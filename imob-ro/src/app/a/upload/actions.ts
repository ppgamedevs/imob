"use server";

import { requireSession } from "@/lib/a/auth";
import { getBulkJobStatus, queueBulkAnalysis } from "@/lib/a/queue";
import { QuotaExceededError } from "@/lib/a/quotas";
import type { BulkJobWithItems } from "@/types/agent";

export async function queueBulk(
  _prevState: unknown,
  formData: FormData,
): Promise<{ jobId?: string; error?: string }> {
  try {
    const session = await requireSession();
    const urlsText = formData.get("urls");

    if (!urlsText || typeof urlsText !== "string") {
      return { error: "Please enter at least one URL" };
    }

    // Parse URLs (one per line)
    const urls = urlsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urls.length === 0) {
      return { error: "Please enter at least one URL" };
    }

    if (urls.length > 500) {
      return { error: "Maximum 500 URLs per batch" };
    }

    // Queue analysis
    const jobId = await queueBulkAnalysis(urls, session.email, session.orgId);

    return { jobId };
  } catch (error) {
    console.error("Queue error:", error);

    if (error instanceof QuotaExceededError) {
      return { error: error.message };
    }

    return {
      error: "Failed to queue analysis. Please try again.",
    };
  }
}

export async function pollJobStatus(
  jobId: string,
): Promise<{ job?: BulkJobWithItems; error?: string }> {
  try {
    await requireSession();

    const job = await getBulkJobStatus(jobId);

    if (!job) {
      return { error: "Job not found" };
    }

    return { job };
  } catch (error) {
    console.error("Poll error:", error);
    return { error: "Failed to fetch job status" };
  }
}
