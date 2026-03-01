import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { auth } from "@/lib/auth";
import { canUse, incUsage } from "@/lib/billing/entitlements";
import { ANALYSIS_DEDUP_WINDOW_MS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";
import { allowRequest } from "@/lib/rateLimiter";

function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input.trim());
    url.hash = "";
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
  const session = await auth();

  if (session?.user?.id) {
    const check = await canUse(session.user.id, "analyze");
    if (!check.allowed) {
      return NextResponse.json(
        {
          error: "limit_reached",
          plan: check.plan,
          used: check.used,
          max: check.max,
          message: `Limita de analize atinsa: ${check.used}/${check.max} in aceasta luna`,
        },
        { status: 402 },
      );
    }
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  if (!allowRequest(`analyze:${ip}`)) {
    logger.warn({ ip }, "Rate limited on /api/analyze");
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const rawUrl = sanitizeUrl(body?.url);
  if (!rawUrl) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const dedupCutoff = new Date(Date.now() - ANALYSIS_DEDUP_WINDOW_MS);
  const existing = await prisma.analysis.findFirst({
    where: { sourceUrl: rawUrl, createdAt: { gte: dedupCutoff } },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return NextResponse.json({ id: existing.id, reused: true });

  const analysis = await prisma.analysis.create({
    data: {
      sourceUrl: rawUrl,
      status: "queued",
      userId: session?.user?.id || null,
    },
  });

  if (session?.user?.id) {
    await incUsage(session.user.id, "analyze", 1);
  }

  void startAnalysis(analysis.id, rawUrl).catch((err) => {
    logger.error({ analysisId: analysis.id, err }, "Background analysis failed");
  });

  return NextResponse.json({ id: analysis.id, reused: false });
}
