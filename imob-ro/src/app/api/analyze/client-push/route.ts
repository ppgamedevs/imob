import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const originUrl = body?.originUrl;
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
