import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { auth } from "@/lib/auth";
import { canUse, incUsage } from "@/lib/billing/entitlements";
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

  // Day 23 - Check entitlement for authenticated users
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
          message: `${check.plan === "free" ? "Free plan" : "Pro plan"} limit reached: ${check.used}/${check.max} analize this month`,
        },
        { status: 402 }, // Payment Required
      );
    }
  }

  // identify client by IP (X-Forwarded-For) or default
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  // rate limiting
  if (!allowRequest(ip)) {
    // record audit
    try {
      await (prisma as any).apiAudit.create({
        data: { ip, endpoint: "/api/analyze", action: "rate_limited", details: getBucketInfo(ip) },
      });
    } catch {}
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // record received
  try {
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
  const analysis = await prisma.analysis.create({
    data: {
      sourceUrl: rawUrl,
      status: "queued",
      userId: session?.user?.id || null,
    },
  });

  // Day 23 - Increment usage counter for authenticated users
  if (session?.user?.id) {
    await incUsage(session.user.id, "analyze", 1);
  }

  // Launch background processing (don't await)
  void Promise.allSettled([startAnalysis(analysis.id, rawUrl)]).catch((e) => console.error(e));

  return NextResponse.json({ id: analysis.id, reused: false });
}
