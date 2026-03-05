import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";
import { enrichTextForAnalysis, enrichVisionForAnalysis } from "@/lib/llm/worker";

const ENRICH_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await rateLimit(`enrich:${ip}`, 10, 60_000);
  } catch {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const { id } = await params;

  try {
    await rateLimit(`enrich:id:${id}`, 3, 300_000);
  } catch {
    return NextResponse.json({ error: "enrich_limit" }, { status: 429 });
  }

  const el = await prisma.extractedListing.findUnique({
    where: { analysisId: id },
    select: { llmEnrichedAt: true, llmVisionAt: true },
  });

  if (!el) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const includeVision = body?.vision === true;

  const results: Record<string, boolean> = {};

  if (!el.llmEnrichedAt) {
    try {
      results.text = await withTimeout(enrichTextForAnalysis(id), ENRICH_TIMEOUT_MS);
    } catch {
      // Timeout or error - mark as attempted so UI stops spinning
      await prisma.extractedListing.update({
        where: { analysisId: id },
        data: { llmEnrichedAt: new Date() },
      }).catch(() => {});
      results.text = false;
    }
  } else {
    results.text = true;
  }

  if (includeVision && !el.llmVisionAt) {
    try {
      results.vision = await withTimeout(enrichVisionForAnalysis(id), ENRICH_TIMEOUT_MS);
    } catch {
      await prisma.extractedListing.update({
        where: { analysisId: id },
        data: { llmVisionAt: new Date() },
      }).catch(() => {});
      results.vision = false;
    }
  } else if (includeVision) {
    results.vision = true;
  }

  return NextResponse.json({ ok: true, results });
}
