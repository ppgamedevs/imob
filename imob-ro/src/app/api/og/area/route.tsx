/**
 * Day 30: Dynamic OpenGraph Images for Area Pages
 * Generates social media images with zone KPIs
 */

import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";

// Use Node.js runtime instead of Edge to avoid 1MB size limit
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400 });
    }

    // Fetch area and latest stats
    const area = await prisma.area.findUnique({
      where: { slug },
    });

    if (!area) {
      return new Response("Area not found", { status: 404 });
    }

    const [latest] = await prisma.areaDaily.findMany({
      where: { areaSlug: slug },
      orderBy: { date: "desc" },
      take: 1,
    });

    const [prev30] = await prisma.areaDaily.findMany({
      where: { areaSlug: slug },
      orderBy: { date: "desc" },
      skip: 29,
      take: 1,
    });

    const medianEurM2 = latest?.medianEurM2 ?? null;
    const supply = latest?.supply ?? 0;
    const change30d =
      latest && latest.medianEurM2 && prev30 && prev30.medianEurM2
        ? ((latest.medianEurM2 - prev30.medianEurM2) / prev30.medianEurM2) * 100
        : null;

    const trendEmoji = change30d === null ? "→" : change30d > 0 ? "↑" : "↓";
    const trendColor = change30d === null ? "#64748b" : change30d > 0 ? "#10b981" : "#ef4444";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "1200px",
            height: "630px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "white",
            padding: "60px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  fontSize: 28,
                  opacity: 0.7,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span>📍</span>
                <span>București</span>
              </div>
              <div style={{ fontSize: 72, fontWeight: "bold", lineHeight: 1.1 }}>{area.name}</div>
            </div>

            {/* KPIs */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "32px",
              }}
            >
              {/* Price */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: 24, opacity: 0.7 }}>Preț median</div>
                <div
                  style={{
                    fontSize: 96,
                    fontWeight: "bold",
                    color: "#3b82f6",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "16px",
                  }}
                >
                  <span>{medianEurM2 ? `${Math.round(medianEurM2).toLocaleString()}` : "N/A"}</span>
                  <span style={{ fontSize: 48, opacity: 0.8 }}>€/m²</span>
                </div>
              </div>

              {/* Trend + Supply */}
              <div
                style={{
                  display: "flex",
                  gap: "48px",
                  fontSize: 32,
                }}
              >
                {change30d !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        fontSize: 48,
                        color: trendColor,
                      }}
                    >
                      {trendEmoji}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ opacity: 0.7, fontSize: 20 }}>Trend 30 zile</span>
                      <span style={{ fontWeight: "bold", color: trendColor }}>
                        {Math.abs(change30d).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: 48 }}>📊</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ opacity: 0.7, fontSize: 20 }}>Oferte active</span>
                    <span style={{ fontWeight: "bold" }}>{supply}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: 0.7,
                fontSize: 24,
              }}
            >
              <span>imob.ro</span>
              <span>Statistici actualizate zilnic</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (err) {
    console.error("OG image error:", err);
    return new Response("Failed to generate image", { status: 500 });
  }
}
