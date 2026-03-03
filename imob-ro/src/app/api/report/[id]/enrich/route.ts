import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { enrichTextForAnalysis, enrichVisionForAnalysis } from "@/lib/llm/worker";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    results.text = await enrichTextForAnalysis(id);
  } else {
    results.text = true;
  }

  if (includeVision && !el.llmVisionAt) {
    results.vision = await enrichVisionForAnalysis(id);
  } else if (includeVision) {
    results.vision = true;
  }

  return NextResponse.json({ ok: true, results });
}
