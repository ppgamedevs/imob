import { NextRequest } from "next/server";
import { renderOg } from "../_shared";
import { prisma } from "@/lib/db";

export const runtime = "edge";

/**
 * GET /api/og/area?slug=...
 *
 * Generates Open Graph image for an area page with:
 * - Area name
 * - Median €/m²
 * - 30-day delta (up/down)
 * - Sparkline chart (last 12 data points)
 *
 * Example:
 * /api/og/area?slug=bucuresti-sector-1&brand=#6A1B9A&logo=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400 });
    }

    // Fetch area
    const area = await prisma.area.findUnique({
      where: { slug },
    });

    if (!area) {
      return new Response("Area not found", { status: 404 });
    }

    // Fetch recent daily aggregates
    const dailyData = await prisma.areaDaily.findMany({
      where: { areaSlug: slug },
      orderBy: { date: "desc" },
      take: 30,
    });

    if (dailyData.length === 0) {
      return new Response("No data available", { status: 404 });
    }

    // Current median €/m²
    const latest = dailyData[0];
    const medianEurM2 = latest.medianEurM2 ? Math.round(latest.medianEurM2) : null;

    // 30-day delta
    const prev30 = dailyData[dailyData.length - 1]; // oldest in last 30 days
    const delta30 =
      medianEurM2 && prev30?.medianEurM2 ? medianEurM2 - Math.round(prev30.medianEurM2) : null;
    const deltaPercent30 =
      delta30 && prev30?.medianEurM2 ? ((delta30 / prev30.medianEurM2) * 100).toFixed(1) : null;

    // Sparkline data (last 12 points, reversed for chronological order)
    const sparklineData = dailyData
      .slice(0, 12)
      .reverse()
      .map((d) => d.medianEurM2 || 0);

    // Generate sparkline SVG path
    const sparklinePath = generateSparklinePath(sparklineData, 300, 100);

    return renderOg(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1.2 }}>{area.name}</h1>
          <p style={{ fontSize: 22, margin: 0, opacity: 0.6 }}>Market Overview</p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "flex-end",
            marginTop: 48,
          }}
        >
          {/* Median €/m² */}
          {medianEurM2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 18, opacity: 0.6 }}>Median €/m²</span>
              <span style={{ fontSize: 56, fontWeight: 700 }}>
                €{medianEurM2.toLocaleString("en")}
              </span>
            </div>
          )}

          {/* 30-day delta */}
          {delta30 !== null && deltaPercent30 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 18, opacity: 0.6 }}>30-day change</span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: delta30 > 0 ? "#10b981" : "#ef4444",
                }}
              >
                {delta30 > 0 ? "+" : ""}
                {deltaPercent30}%
              </span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData.length > 0 && (
          <div
            style={{
              display: "flex",
              marginTop: 32,
              width: 300,
              height: 100,
            }}
          >
            <svg width="300" height="100" viewBox="0 0 300 100" style={{ overflow: "visible" }}>
              <path
                d={sparklinePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>,
      {
        brand: searchParams.get("brand") || undefined,
        logo: searchParams.get("logo") || undefined,
        titleSuffix: searchParams.get("title") || undefined,
      },
    );
  } catch (error) {
    console.error("OG Area error:", error);
    return new Response("Error generating OG image", { status: 500 });
  }
}

/**
 * Generates SVG path for sparkline chart
 */
function generateSparklinePath(data: number[], width: number, height: number): string {
  if (data.length === 0) return "";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid division by zero

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")}`;
}
