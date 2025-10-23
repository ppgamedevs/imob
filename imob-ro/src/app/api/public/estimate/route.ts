/**
 * Public API: Price Estimate
 * GET /api/public/estimate?areaSlug=...&areaM2=...&rooms=...&year=...&condition=...
 * Returns AVM price estimation
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, trackApiUsage } from "@/lib/api/validate-key";
import { estimateAVMFromFeatures } from "@/lib/ml/owner-avm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate API key
    const apiKey = await validateApiKey(req);
    if (!apiKey) {
      await trackApiUsage({
        apiKeyId: "unknown",
        endpoint: "/api/public/estimate",
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
        },
      );
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const areaSlug = searchParams.get("areaSlug");
    const areaM2Str = searchParams.get("areaM2");
    const roomsStr = searchParams.get("rooms");
    const yearStr = searchParams.get("year");
    const conditionStr = searchParams.get("condition");
    const levelStr = searchParams.get("level");
    const distMetroMStr = searchParams.get("distMetroM");

    // Validate required params
    if (!areaSlug || !areaM2Str) {
      await trackApiUsage({
        apiKeyId: apiKey.id,
        endpoint: "/api/public/estimate",
        method: "GET",
        statusCode: 400,
        responseMs: Date.now() - startTime,
        req,
      });

      return NextResponse.json(
        { error: "Missing required parameters: areaSlug, areaM2" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Parse numbers
    const areaM2 = parseFloat(areaM2Str);
    const rooms = roomsStr ? parseInt(roomsStr, 10) : null;
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const condition = conditionStr ? parseFloat(conditionStr) : null;
    const level = levelStr ? parseInt(levelStr, 10) : null;
    const distMetroM = distMetroMStr ? parseInt(distMetroMStr, 10) : null;

    // Validate areaM2
    if (isNaN(areaM2) || areaM2 < 8 || areaM2 > 1000) {
      await trackApiUsage({
        apiKeyId: apiKey.id,
        endpoint: "/api/public/estimate",
        method: "GET",
        statusCode: 400,
        responseMs: Date.now() - startTime,
        req,
      });

      return NextResponse.json(
        { error: "Invalid areaM2: must be between 8 and 1000" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Call AVM estimation
    const estimate = await estimateAVMFromFeatures({
      areaSlug,
      areaM2,
      rooms: rooms ?? undefined,
      yearBuilt: year ?? undefined,
      conditionScore: condition ?? undefined,
      level: level ?? undefined,
      distMetroM: distMetroM ?? undefined,
    });

    // Check if estimation failed
    if (!estimate.low || !estimate.mid || !estimate.high) {
      await trackApiUsage({
        apiKeyId: apiKey.id,
        endpoint: "/api/public/estimate",
        method: "GET",
        statusCode: 400,
        responseMs: Date.now() - startTime,
        req,
      });

      return NextResponse.json(
        {
          error: "Unable to estimate price",
          reason: estimate.explain?.reason ?? "unknown",
        },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const response = {
      low: estimate.low,
      mid: estimate.mid,
      high: estimate.high,
      conf: estimate.conf,
      eurM2: Math.round(estimate.mid / areaM2),
      explain: estimate.explain,
    };

    // Track usage
    await trackApiUsage({
      apiKeyId: apiKey.id,
      endpoint: "/api/public/estimate",
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
        "Cache-Control": "public, max-age=300", // 5 minutes
      },
    });
  } catch (error) {
    console.error("Error in /api/public/estimate:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
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
