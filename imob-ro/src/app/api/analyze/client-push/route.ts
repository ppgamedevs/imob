import { NextResponse } from "next/server";
import { z } from "zod";

import { generateContentHash } from "@/lib/content-hash";
import { prisma } from "@/lib/db";
import { allowRequest, createRateLimitResponse, getClientIp } from "@/lib/rate-limiter-enhanced";
import { sanitizeListing } from "@/lib/sanitize";
import { normalizeUrl } from "@/lib/url";

// Validation schema for incoming request
const analyzeRequestSchema = z.object({
  originUrl: z.string().url("Invalid origin URL"),
  extracted: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      areaM2: z.number().optional(),
      rooms: z.number().optional(),
      addressRaw: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      photos: z.array(z.string().url()).optional(),
    })
    .passthrough(), // Allow additional fields
});

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

  // Validate input with Zod
  let validated;
  try {
    validated = analyzeRequestSchema.parse(body);
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        message: error instanceof z.ZodError ? error.issues : "Validation failed",
      },
      { status: 400 },
    );
  }

  const { originUrl, extracted } = validated;

  // Check if domain is disallowed
  if (isDisallowedDomain(originUrl)) {
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

  const norm = normalizeUrl(originUrl);
  if (!norm) return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });

  // Sanitize extracted content to prevent XSS
  const sanitizedExtracted = sanitizeListing(extracted);

  // Generate content hash for deduplication
  const contentHash = generateContentHash(sanitizedExtracted);

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

  // Ensure photos is an array (JSON) and use sanitized data
  const photos = Array.isArray(sanitizedExtracted.photos) ? sanitizedExtracted.photos : [];

  // Upsert ExtractedListing for this analysis
  await prisma.extractedListing.upsert({
    where: { analysisId: analysis.id },

    create: {
      analysisId: analysis.id,
      title: sanitizedExtracted.title || undefined,
      price: sanitizedExtracted.price || undefined,
      currency: sanitizedExtracted.currency || undefined,
      areaM2: sanitizedExtracted.areaM2 || undefined,
      rooms: sanitizedExtracted.rooms || undefined,
      floor: sanitizedExtracted.floor || undefined,
      floorRaw: sanitizedExtracted.floorRaw || undefined,
      yearBuilt: sanitizedExtracted.yearBuilt || undefined,
      addressRaw: sanitizedExtracted.addressRaw || undefined,
      lat: sanitizedExtracted.lat || undefined,
      lng: sanitizedExtracted.lng || undefined,
      photos: photos,
      sourceMeta: sanitizedExtracted.sourceMeta || undefined,
    } as any,

    update: {
      title: sanitizedExtracted.title || undefined,
      price: sanitizedExtracted.price || undefined,
      currency: sanitizedExtracted.currency || undefined,
      areaM2: sanitizedExtracted.areaM2 || undefined,
      rooms: sanitizedExtracted.rooms || undefined,
      floor: sanitizedExtracted.floor || undefined,
      floorRaw: sanitizedExtracted.floorRaw || undefined,
      yearBuilt: sanitizedExtracted.yearBuilt || undefined,
      addressRaw: sanitizedExtracted.addressRaw || undefined,
      lat: sanitizedExtracted.lat || undefined,
      lng: sanitizedExtracted.lng || undefined,
      photos: photos,
      sourceMeta: sanitizedExtracted.sourceMeta || undefined,
    } as any,
  });

  return NextResponse.json({ analysisId: analysis.id, cached: false });
}
