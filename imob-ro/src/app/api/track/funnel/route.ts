import { createHash } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isFunnelEventName, trackFunnelEvent, type FunnelEventName } from "@/lib/tracking/funnel";
import { redactSensitiveUrlParams } from "@/lib/url/sensitive-query";

export const runtime = "nodejs";

const MAX_JSON_BYTES = 16_000;

function hashRequestIp(req: Request): string | null {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  if (!raw || raw === "unknown") return null;
  const salt =
    process.env.FUNNEL_IP_SALT?.trim() || process.env.AUTH_SECRET?.trim() || "imob-funnel-ip";
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_JSON_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 400 });
  }

  let body: {
    eventName?: string;
    analysisId?: string;
    anonymousId?: string;
    path?: string;
    referrer?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { eventName } = body;
  if (!eventName || !isFunnelEventName(eventName)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const ipHash = hashRequestIp(req);
  const metadata: Record<string, unknown> = { ...(body.metadata ?? {}) };
  if (ipHash) metadata.ipHash = ipHash;

  const path = redactSensitiveUrlParams(
    typeof body.path === "string" && body.path.length > 0
      ? body.path
      : new URL(req.url).pathname,
  );

  const referrer =
    typeof body.referrer === "string" ? redactSensitiveUrlParams(body.referrer) : null;

  await trackFunnelEvent(eventName as FunnelEventName, {
    userId,
    analysisId: typeof body.analysisId === "string" ? body.analysisId : null,
    anonymousId: typeof body.anonymousId === "string" ? body.anonymousId : null,
    path,
    referrer: referrer && referrer.length > 0 ? referrer : null,
    metadata: Object.keys(metadata).length ? metadata : null,
  });

  return NextResponse.json({ ok: true });
}
