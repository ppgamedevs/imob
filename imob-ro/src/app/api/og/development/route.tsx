// Step 11: OG image generator for developments
// /api/og/development?slug=...

import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const slug = searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400 });
    }

    // Load development data
    const development = await prisma.development.findUnique({
      where: { slug },
      select: {
        name: true,
        deliveryAt: true,
        photos: true,
        units: {
          select: { priceEur: true },
          orderBy: { priceEur: "asc" },
          take: 1,
        },
        developer: {
          select: { name: true, logoUrl: true },
        },
      },
    });

    if (!development) {
      return new Response("Development not found", { status: 404 });
    }

    const photos = (development.photos as string[]) || [];
    const coverPhoto = photos[0];
    const minPrice = development.units[0]?.priceEur || 0;
    const minPriceFormatted = new Intl.NumberFormat("ro-RO").format(minPrice);
    const deliveryYear = development.deliveryAt
      ? new Date(development.deliveryAt).getFullYear()
      : null;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          {/* Cover Photo Background */}
          {coverPhoto && (
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                opacity: 0.3,
                backgroundImage: `url(${coverPhoto})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              padding: "60px",
              color: "white",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {development.developer?.logoUrl && (
                <img
                  src={development.developer.logoUrl}
                  alt="Developer Logo"
                  width={80}
                  height={80}
                  style={{ borderRadius: "8px", background: "white", padding: "8px" }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "24px",
                    opacity: 0.9,
                    fontWeight: "500",
                  }}
                >
                  {development.developer?.name || "Dezvoltare Nouă"}
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  fontSize: "72px",
                  fontWeight: "bold",
                  lineHeight: 1.1,
                  maxWidth: "900px",
                }}
              >
                {development.name}
              </div>

              {/* Price & Delivery */}
              <div style={{ display: "flex", gap: "40px", fontSize: "32px" }}>
                {minPrice > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "rgba(255, 255, 255, 0.2)",
                      padding: "20px 30px",
                      borderRadius: "12px",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div style={{ fontSize: "20px", opacity: 0.8 }}>De la</div>
                    <div style={{ fontSize: "40px", fontWeight: "bold" }}>
                      {minPriceFormatted} €
                    </div>
                  </div>
                )}

                {deliveryYear && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "rgba(255, 255, 255, 0.2)",
                      padding: "20px 30px",
                      borderRadius: "12px",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div style={{ fontSize: "20px", opacity: 0.8 }}>Livrare</div>
                    <div style={{ fontSize: "40px", fontWeight: "bold" }}>
                      {deliveryYear}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "24px", opacity: 0.9 }}>
                Descoperă toate unitățile disponibile
              </div>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>iR</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("[og] Error generating image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
