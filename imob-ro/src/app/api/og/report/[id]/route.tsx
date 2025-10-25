import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";

import { renderOg } from "../../_shared";

export const runtime = "edge";

/**
 * GET /api/og/report/[id]
 *
 * Generates Open Graph image for an analysis/report with:
 * - Property title + area
 * - AVM mid value + €/m²
 * - Badges (confidence, yield, risk)
 * - Cover photo (if available)
 *
 * Example:
 * /api/og/report/123?brand=#6A1B9A&logo=...
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const analysisId = resolvedParams.id;

    // Fetch analysis with extracted listing and scores
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        extractedListing: true,
        scoreSnapshot: true,
      },
    });

    if (!analysis || !analysis.extractedListing) {
      return new Response("Analysis not found", { status: 404 });
    }

    const { extractedListing: listing, scoreSnapshot: scores } = analysis;
    const avmMid = scores?.avmMid ? Math.round(scores.avmMid) : null;
    const eurM2 = avmMid && listing.areaM2 ? Math.round(avmMid / listing.areaM2) : null;

    // Badges
    const badges = [];
    if (scores?.avmConf) {
      badges.push({
        label: "Confidence",
        value: `${Math.round(scores.avmConf * 100)}%`,
        color: "#10b981", // green
      });
    }
    if (scores?.yieldNet) {
      badges.push({
        label: "Yield",
        value: `${(scores.yieldNet * 100).toFixed(1)}%`,
        color: "#f59e0b", // amber
      });
    }
    if (scores?.riskClass) {
      badges.push({
        label: "Risk",
        value: scores.riskClass,
        color: scores.riskClass === "RS1" ? "#10b981" : "#ef4444",
      });
    }

    // Cover photo (first from photos JSON array)
    const photos = (listing.photos as string[]) || [];
    const coverPhoto = photos[0] || null;

    return renderOg(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "row",
          gap: 32,
        }}
      >
        {/* Left: Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ fontSize: 44, margin: 0, lineHeight: 1.2 }}>
              {listing.title || "Property Analysis"}
            </h1>
            {listing.addressRaw && (
              <p style={{ fontSize: 22, margin: 0, opacity: 0.7 }}>{listing.addressRaw}</p>
            )}
          </div>

          {/* AVM + €/m² */}
          {avmMid && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginTop: 32,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, opacity: 0.6 }}>AVM Median</span>
                <span style={{ fontSize: 48, fontWeight: 700 }}>
                  €{avmMid.toLocaleString("en")}
                </span>
              </div>
              {eurM2 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 18, opacity: 0.6 }}>Price/m²</span>
                  <span style={{ fontSize: 32, fontWeight: 600 }}>
                    €{eurM2.toLocaleString("en")}/m²
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              {badges.map((badge, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: `${badge.color}20`,
                    border: `1px solid ${badge.color}`,
                    borderRadius: 8,
                    fontSize: 16,
                  }}
                >
                  <span style={{ opacity: 0.7 }}>{badge.label}</span>
                  <span style={{ fontWeight: 700 }}>{badge.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cover photo */}
        {coverPhoto && (
          <div
            style={{
              width: 400,
              height: "100%",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <img src={coverPhoto} width={400} height={630} style={{ objectFit: "cover" }} />
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
    console.error("OG Report error:", error);
    return new Response("Error generating OG image", { status: 500 });
  }
}
