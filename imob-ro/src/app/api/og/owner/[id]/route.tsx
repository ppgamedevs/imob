import { NextRequest } from "next/server";
import { renderOg } from "../../_shared";
import { prisma } from "@/lib/db";

export const runtime = "edge";

/**
 * GET /api/og/owner/[id]
 *
 * Generates Open Graph image for owner estimation (OwnerLead) with:
 * - Property location hint
 * - AVM mid estimate
 * - TTS bucket
 * - Yield estimate
 *
 * Example:
 * /api/og/owner/abc123?brand=#6A1B9A&logo=...
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const leadId = resolvedParams.id;

    // Fetch owner lead
    const lead = await prisma.ownerLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return new Response("Owner lead not found", { status: 404 });
    }

    // AVM + TTS + Yield
    const avmMid = lead.avmMid ? Math.round(lead.avmMid) : null;
    const ttsBucket = lead.ttsBucket || null;
    const yieldNet = lead.yieldNet ? (lead.yieldNet * 100).toFixed(1) : null;

    // Location hint (masked for privacy)
    const locationHint = lead.addressHint
      ? lead.addressHint.slice(0, 30) + "..."
      : lead.areaSlug || lead.city || "Property";

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
          <p style={{ fontSize: 22, margin: 0, opacity: 0.6 }}>Property Valuation</p>
          <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1.2 }}>{locationHint}</h1>
          {lead.rooms && (
            <p style={{ fontSize: 20, margin: 0, opacity: 0.7 }}>
              {lead.rooms} room{lead.rooms > 1 ? "s" : ""} •{" "}
              {lead.areaM2 ? `${Math.round(lead.areaM2)}m²` : ""}
            </p>
          )}
        </div>

        {/* AVM + Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            marginTop: 48,
          }}
        >
          {/* AVM */}
          {avmMid && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 18, opacity: 0.6 }}>Estimated Value</span>
              <span style={{ fontSize: 56, fontWeight: 700 }}>€{avmMid.toLocaleString("en")}</span>
            </div>
          )}

          {/* TTS + Yield */}
          <div style={{ display: "flex", gap: 48 }}>
            {ttsBucket && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 16, opacity: 0.6 }}>Time to Sell</span>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{ttsBucket}</span>
              </div>
            )}
            {yieldNet && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 16, opacity: 0.6 }}>Est. Yield</span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#10b981",
                  }}
                >
                  {yieldNet}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div
          style={{
            display: "flex",
            padding: "16px 20px",
            background: "rgba(148, 163, 184, 0.1)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: 8,
            fontSize: 16,
            opacity: 0.8,
            marginTop: 32,
          }}
        >
          <span>ℹ️ Automated estimation based on market data. Not professional appraisal.</span>
        </div>
      </div>,
      {
        brand: searchParams.get("brand") || undefined,
        logo: searchParams.get("logo") || undefined,
        titleSuffix: searchParams.get("title") || undefined,
      },
    );
  } catch (error) {
    console.error("OG Owner error:", error);
    return new Response("Error generating OG image", { status: 500 });
  }
}
