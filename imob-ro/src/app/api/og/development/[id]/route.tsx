import { NextRequest } from "next/server";
import { renderOg } from "../../_shared";
import { prisma } from "@/lib/db";

export const runtime = "edge";

/**
 * GET /api/og/development/[id]
 *
 * Generates Open Graph image for a development project with:
 * - Project name
 * - Developer name
 * - Delivery date
 * - Unit count (from units relation)
 * - Cover photo (if available)
 *
 * Example:
 * /api/og/development/abc123?brand=#6A1B9A&logo=...
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const devId = resolvedParams.id;

    // Fetch development with units for stats
    const dev = await prisma.development.findUnique({
      where: { id: devId },
      include: {
        developer: true,
        units: {
          select: {
            priceEur: true,
          },
        },
      },
    });

    if (!dev) {
      return new Response("Development not found", { status: 404 });
    }

    // Calculate price range from units
    const prices = dev.units.map((u) => u.priceEur).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const priceRange =
      minPrice && maxPrice
        ? `€${Math.round(minPrice).toLocaleString("en")} - €${Math.round(maxPrice).toLocaleString("en")}`
        : minPrice
          ? `From €${Math.round(minPrice).toLocaleString("en")}`
          : "Price on request";

    // Delivery
    const delivery = dev.deliveryAt
      ? new Date(dev.deliveryAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
      : "TBA";

    // Unit count
    const unitCount = dev.units.length;

    // Cover photo (first from photos JSON array)
    const photos = (dev.photos as string[]) || [];
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
            <p style={{ fontSize: 22, margin: 0, opacity: 0.6 }}>New Development</p>
            <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1.2 }}>{dev.name}</h1>
            {dev.developer?.name && (
              <p style={{ fontSize: 20, margin: 0, opacity: 0.7 }}>by {dev.developer.name}</p>
            )}
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              marginTop: 32,
            }}
          >
            {/* Price range */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 18, opacity: 0.6 }}>Price range</span>
              <span style={{ fontSize: 36, fontWeight: 700 }}>{priceRange}</span>
            </div>

            {/* Delivery + Units */}
            <div style={{ display: "flex", gap: 48 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 16, opacity: 0.6 }}>Delivery</span>
                <span style={{ fontSize: 24, fontWeight: 600 }}>{delivery}</span>
              </div>
              {unitCount > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 16, opacity: 0.6 }}>Units</span>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{unitCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: "rgba(34, 197, 94, 0.2)",
              border: "1px solid #22c55e",
              borderRadius: 8,
              fontSize: 18,
              maxWidth: 200,
            }}
          >
            <span>🏗️</span>
            <span>Under Construction</span>
          </div>
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
    console.error("OG Development error:", error);
    return new Response("Error generating OG image", { status: 500 });
  }
}
