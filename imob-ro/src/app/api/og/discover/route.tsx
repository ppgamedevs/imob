import { NextRequest } from "next/server";

import { renderOg } from "../_shared";

export const runtime = "edge";

/**
 * GET /api/og/discover?query=...&filters=...
 *
 * Generates Open Graph image for search/discover results with:
 * - Search query
 * - Filter summary (rooms, price range, area)
 * - Result count
 * - Top KPIs (median price, avg TTS)
 *
 * Example:
 * /api/og/discover?query=2 camere&filters=Dorobanți, €100k-150k&count=42
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "Search Results";
    const filters = searchParams.get("filters") || "";
    const count = parseInt(searchParams.get("count") || "0", 10);
    const medianPrice = searchParams.get("medianPrice");
    const avgTts = searchParams.get("avgTts");

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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 22, margin: 0, opacity: 0.6 }}>Search Results</p>
          <h1 style={{ fontSize: 52, margin: 0, lineHeight: 1.2 }}>{query}</h1>
          {filters && <p style={{ fontSize: 24, margin: 0, opacity: 0.7 }}>{filters}</p>}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 48,
            alignItems: "flex-end",
          }}
        >
          {/* Result count */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 18, opacity: 0.6 }}>Properties found</span>
            <span style={{ fontSize: 56, fontWeight: 700 }}>{count.toLocaleString("en")}</span>
          </div>

          {/* Median price */}
          {medianPrice && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 18, opacity: 0.6 }}>Median price</span>
              <span style={{ fontSize: 32, fontWeight: 600 }}>{medianPrice}</span>
            </div>
          )}

          {/* Avg TTS */}
          {avgTts && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 18, opacity: 0.6 }}>Avg. TTS</span>
              <span style={{ fontSize: 32, fontWeight: 600 }}>{avgTts}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 48,
            padding: "16px 24px",
            background: "rgba(37, 99, 235, 0.2)",
            border: "1px solid #2563eb",
            borderRadius: 12,
            fontSize: 20,
            maxWidth: 400,
          }}
        >
          <span style={{ fontSize: 24 }}>🔍</span>
          <span>Explore detailed insights</span>
        </div>
      </div>,
      {
        brand: searchParams.get("brand") || undefined,
        logo: searchParams.get("logo") || undefined,
        titleSuffix: searchParams.get("title") || undefined,
      },
    );
  } catch (error) {
    console.error("OG Discover error:", error);
    return new Response("Error generating OG image", { status: 500 });
  }
}
