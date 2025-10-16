import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { prisma } from "@/lib/db";

function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input.trim());
    // Optionally normalize: remove utm params, hash
    url.hash = "";
    // remove common tracking params
    url.searchParams.forEach((_, key) => {
      if (key.startsWith("utm_") || key === "fbclid") url.searchParams.delete(key);
    });
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawUrl = sanitizeUrl(body?.url);
  if (!rawUrl) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  // dedupe: look for existing analysis with same sourceUrl within 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const existing = await prisma.analysis.findFirst({
    where: {
      sourceUrl: rawUrl,
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return NextResponse.json({ id: existing.id, reused: true });

  // create new analysis with queued status
  const analysis = await prisma.analysis.create({ data: { sourceUrl: rawUrl, status: "queued" } });

  // Launch background processing (don't await)
  void Promise.allSettled([startAnalysis(analysis.id, rawUrl)]).catch((e) => console.error(e));

  return NextResponse.json({ id: analysis.id, reused: false });
}
