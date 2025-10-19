import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { allowRequest, getBucketInfo } from "@/lib/rateLimiter";

function isDisallowedDomain(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const raw = (process.env.DISALLOWED_DOMAINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return raw.includes(host);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!allowRequest(ip)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).apiAudit.create({
        data: {
          ip,
          endpoint: "/api/analyze/client-push",
          action: "rate_limited",
          details: getBucketInfo(ip),
        },
      });
    } catch {}
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const originUrl = body?.originUrl;
  if (typeof originUrl === "string" && isDisallowedDomain(originUrl)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).apiAudit.create({
        data: {
          ip,
          endpoint: "/api/analyze/client-push",
          action: "blocked_domain",
          details: { originUrl },
        },
      });
    } catch {}
    return NextResponse.json({ error: "blocked_domain" }, { status: 403 });
  }
  const extracted = body?.extracted;
  if (!originUrl || !extracted)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  // Find an existing analysis for this URL (most recent)
  let analysis = await prisma.analysis.findFirst({
    where: { sourceUrl: originUrl },
    orderBy: { createdAt: "desc" },
  });

  if (!analysis) {
    analysis = await prisma.analysis.create({ data: { sourceUrl: originUrl, status: "queued" } });
  }

  // Upsert ExtractedListing for this analysis
  await prisma.extractedListing.upsert({
    where: { analysisId: analysis.id },
    create: {
      analysisId: analysis.id,
      title: extracted.title || undefined,
      price: extracted.price || undefined,
      currency: extracted.currency || undefined,
      areaM2: extracted.areaM2 || undefined,
      rooms: extracted.rooms || undefined,
      floor: extracted.floor || undefined,
      yearBuilt: extracted.yearBuilt || undefined,
      addressRaw: extracted.addressRaw || undefined,
      lat: extracted.lat || undefined,
      lng: extracted.lng || undefined,
      photos: extracted.photos ? JSON.stringify(extracted.photos) : undefined,
    },
    update: {
      title: extracted.title || undefined,
      price: extracted.price || undefined,
      currency: extracted.currency || undefined,
      areaM2: extracted.areaM2 || undefined,
      rooms: extracted.rooms || undefined,
      floor: extracted.floor || undefined,
      yearBuilt: extracted.yearBuilt || undefined,
      addressRaw: extracted.addressRaw || undefined,
      lat: extracted.lat || undefined,
      lng: extracted.lng || undefined,
      photos: extracted.photos ? JSON.stringify(extracted.photos) : undefined,
    },
  });

  return NextResponse.json({ analysisId: analysis.id });
}
