/**
 * OG Image for Compare Pages
 *
 * Generates social share image with comparison bars
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { loadCompareListings } from "@/lib/compare/load";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const ids = searchParams.get("ids")?.split(",").slice(0, 4) || [];

    if (!ids.length) {
      return new Response("Missing ids parameter", { status: 400 });
    }

    const items = await loadCompareListings(ids);

    if (!items.length) {
      return new Response("No items found", { status: 404 });
    }

    // Calculate chart data
    const maxEurM2 = Math.max(...items.map((i) => i.eurM2 || 0));
    const maxYield = Math.max(...items.map((i) => i.yield?.net || 0));

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "#0a0a0a",
            padding: "60px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", marginBottom: "40px" }}>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#ffffff",
              }}
            >
              Compară {items.length} proprietăți
            </div>
          </div>

          {/* Comparison bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px", flex: 1 }}>
            {/* Price per sqm */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "20px", color: "#a1a1a1" }}>Preț €/m²</div>
              {items.map((item, idx) => {
                const value = item.eurM2 || 0;
                const percent = maxEurM2 > 0 ? (value / maxEurM2) * 100 : 0;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "200px",
                        fontSize: "16px",
                        color: "#ffffff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.areaName}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: "32px",
                        backgroundColor: "#1a1a1a",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          height: "100%",
                          backgroundColor: "#6366f1",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: "120px",
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#ffffff",
                        textAlign: "right",
                      }}
                    >
                      {value.toLocaleString("ro-RO")} €
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Yield */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "20px", color: "#a1a1a1" }}>Randament net %</div>
              {items.map((item, idx) => {
                const value = item.yield?.net || 0;
                const percent = maxYield > 0 ? (value / maxYield) * 100 : 0;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "200px",
                        fontSize: "16px",
                        color: "#ffffff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.areaName}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: "32px",
                        backgroundColor: "#1a1a1a",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          height: "100%",
                          backgroundColor: "#10b981",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: "120px",
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#ffffff",
                        textAlign: "right",
                      }}
                    >
                      {value.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "40px",
              paddingTop: "32px",
              borderTop: "1px solid #2a2a2a",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#6366f1" }}>imob.ro</div>
            <div style={{ fontSize: "16px", color: "#a1a1a1" }}>Comparație proprietăți</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error("Error generating compare OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
