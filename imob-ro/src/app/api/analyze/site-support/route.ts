import { NextResponse } from "next/server";

import { isAnalyzeFailureReason } from "@/lib/analyze/analyze-failure-reasons";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/obs/logger";
import { allowRequest } from "@/lib/rateLimiter";
import { trackFunnelEvent } from "@/lib/tracking/funnel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!allowRequest(`site-support:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : null;
  const reasonRaw = typeof body.reason === "string" ? body.reason : "";
  const reason = isAnalyzeFailureReason(reasonRaw) ? reasonRaw : "unsupported_domain";
  const analysisId = typeof body.analysisId === "string" ? body.analysisId : null;

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const host = (() => {
    if (!sourceUrl) return null;
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  try {
    await trackFunnelEvent("site_support_interest", {
      userId,
      analysisId: analysisId ?? null,
      sourceUrl,
      path: "/api/analyze/site-support",
      metadata: {
        reason,
        targetHost: host,
        email,
        emailDomain: email.split("@")[1] ?? null,
      },
    });
  } catch (e) {
    logger.error({ e }, "site_support route failed");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
