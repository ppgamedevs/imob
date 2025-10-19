import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { prisma } from "@/lib/db";
import { allowRequest, getBucketInfo } from "@/lib/rateLimiter";

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
  // identify client by IP (X-Forwarded-For) or default
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  // rate limiting
  if (!allowRequest(ip)) {
    // record audit
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).apiAudit.create({
        data: { ip, endpoint: "/api/analyze", action: "rate_limited", details: getBucketInfo(ip) },
      });
    } catch {}
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // record received
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).apiAudit.create({
      data: { ip, endpoint: "/api/analyze", action: "request_received", details: body ?? {} },
    });
  } catch {}
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
