/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { allowRequest, getClientIp, createRateLimitResponse } from "@/lib/rate-limiter-enhanced";
import { normalizeUrl } from "@/lib/url";
import { generateContentHash } from "@/lib/content-hash";

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
  const ip = getClientIp(req);

  // Enhanced rate limiting: 30 requests/minute for analyze endpoint
  if (!allowRequest(ip, "analyze")) {
    try {
      await (prisma as any).apiAudit.create({
        data: {
          ip,
          endpoint: "/api/analyze/client-push",
          action: "rate_limited",
          details: { limitType: "analyze" },
        },
      });
    } catch {}
    return createRateLimitResponse(ip, "analyze");
  }

  const originUrl = body?.originUrl;
  if (typeof originUrl === "string" && isDisallowedDomain(originUrl)) {
    try {
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

  const norm = normalizeUrl(originUrl as string);
  if (!norm) return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });

  // Generate content hash for deduplication
  const contentHash = generateContentHash(extracted);

  // Check for existing analysis with same content hash (idempotency)
  const existingByHash = await prisma.analysis.findFirst({
    where: {
      contentHash,
      status: { in: ["done", "extracting", "normalizing", "scoring"] }, // Skip failed/queued
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingByHash) {
    // Content already processed, return existing analysis ID
    return NextResponse.json({
      analysisId: existingByHash.id,
      cached: true,
      reason: "duplicate_content",
    });
  }

  // Find an existing analysis for this URL (most recent)
  let analysis = await prisma.analysis.findFirst({
    where: { sourceUrl: norm },
    orderBy: { createdAt: "desc" },
  });

  if (!analysis) {
    analysis = await prisma.analysis.create({
      data: {
        sourceUrl: norm,
        canonicalUrl: norm, // Set canonical URL to normalized URL initially
        contentHash,
        status: "queued",
      },
    });
  } else {
    // Update content hash on existing analysis
    analysis = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        contentHash,
        canonicalUrl: norm,
        updatedAt: new Date(),
      },
    });
  }

  // Ensure photos is an array (JSON)
  const photos = Array.isArray(extracted.photos) ? extracted.photos : [];

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
      floorRaw: extracted.floorRaw || undefined,
      yearBuilt: extracted.yearBuilt || undefined,
      addressRaw: extracted.addressRaw || undefined,
      lat: extracted.lat || undefined,
      lng: extracted.lng || undefined,
      photos: photos,
      sourceMeta: extracted.sourceMeta || undefined,
    } as any,

    update: {
      title: extracted.title || undefined,
      price: extracted.price || undefined,
      currency: extracted.currency || undefined,
      areaM2: extracted.areaM2 || undefined,
      rooms: extracted.rooms || undefined,
      floor: extracted.floor || undefined,
      floorRaw: extracted.floorRaw || undefined,
      yearBuilt: extracted.yearBuilt || undefined,
      addressRaw: extracted.addressRaw || undefined,
      lat: extracted.lat || undefined,
      lng: extracted.lng || undefined,
      photos: photos,
      sourceMeta: extracted.sourceMeta || undefined,
    } as any,
  });

  return NextResponse.json({ analysisId: analysis.id, cached: false });
}
