/**
 * Public API: Area KPIs
 * GET /api/public/area/:slug/kpis
 * Returns area statistics (median €/m², change, rent, yield, TTS, demand, supply)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, trackApiUsage } from "@/lib/api/validate-key";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now();
  const { slug } = await params;

  try {
    // Validate API key
    const apiKey = await validateApiKey(req);
    if (!apiKey) {
      await trackApiUsage({
        apiKeyId: "unknown",
        endpoint: `/api/public/area/${slug}/kpis`,
        method: "GET",
        statusCode: 401,
        req,
      }).catch(() => {});

      return NextResponse.json(
        { error: "Invalid or missing API key" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "x-api-key",
          },
        }
      );
    }

    // Fetch area
    const area = await prisma.area.findUnique({
      where: { slug },
    });

    if (!area) {
      await trackApiUsage({
        apiKeyId: apiKey.id,
        endpoint: `/api/public/area/${slug}/kpis`,
        method: "GET",
        statusCode: 404,
        responseMs: Date.now() - startTime,
        req,
      });

      return NextResponse.json(
        { error: "Area not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Fetch latest AreaDaily
    const [latest] = await prisma.areaDaily.findMany({
      where: { areaSlug: slug },
      orderBy: { date: "desc" },
      take: 1,
    });

    // Fetch 30 days ago for change calculation
    const [prev30] = await prisma.areaDaily.findMany({
      where: { areaSlug: slug },
      orderBy: { date: "desc" },
      skip: 29,
      take: 1,
    });

    const medianEurM2 = latest?.medianEurM2 ?? null;
    const change30d =
      latest && prev30 && prev30.medianEurM2
        ? (latest.medianEurM2! - prev30.medianEurM2) / prev30.medianEurM2
        : null;

    // Extract stats from latest AreaDaily
    const stats = (latest?.stats as any) ?? {};
    const rentEurM2 =
      typeof stats.rentEurM2 === "number" ? stats.rentEurM2 : null;
    const yieldNet =
      typeof stats.yieldNet === "number" ? stats.yieldNet : null;
    const ttsMedianDays =
      typeof stats.ttsMedianDays === "number" ? stats.ttsMedianDays : null;
    const demandScore = latest?.demandScore ?? null;
    const supply = latest?.supply ?? null;

    const response = {
      slug: area.slug,
      name: area.name,
      medianEurM2,
      change30d,
      rentEurM2,
      yieldNet,
      ttsMedianDays,
      demandScore,
      supply,
      updatedAt: latest?.date ?? null,
    };

    // Track usage
    await trackApiUsage({
      apiKeyId: apiKey.id,
      endpoint: `/api/public/area/${slug}/kpis`,
      method: "GET",
      statusCode: 200,
      responseMs: Date.now() - startTime,
      req,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "x-api-key",
        "Cache-Control": "public, max-age=3600", // 1 hour
      },
    });
  } catch (error) {
    console.error("Error in /api/public/area/[slug]/kpis:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "x-api-key",
    },
  });
}
