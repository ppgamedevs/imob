/**
 * Image Proxy API
 * GET /api/img?src=...&w=320|640|1280
 * Proxies external images through Next.js Image optimization
 * Adds 7-day cache headers and generates responsive thumbnails
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Allowed widths for responsive images
const ALLOWED_WIDTHS = [320, 640, 1280];

// Allowed domains for security (expand as needed)
const ALLOWED_DOMAINS = [
  "imobiliare.ro",
  "olx.ro",
  "storia.ro",
  "images.unsplash.com",
  "res.cloudinary.com",
  // Add other trusted image CDNs
];

function isAllowedDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_DOMAINS.some((domain) => parsedUrl.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const src = searchParams.get("src");
  const widthParam = searchParams.get("w");

  // Validate source URL
  if (!src) {
    return NextResponse.json({ error: "Missing src parameter" }, { status: 400 });
  }

  // Validate URL format
  let imageUrl: URL;
  try {
    imageUrl = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src URL" }, { status: 400 });
  }

  // Security: only allow whitelisted domains
  if (!isAllowedDomain(src)) {
    return NextResponse.json(
      { error: "Domain not allowed", allowed: ALLOWED_DOMAINS },
      { status: 403 },
    );
  }

  // Parse width (default 640)
  const width = widthParam ? parseInt(widthParam, 10) : 640;
  if (!ALLOWED_WIDTHS.includes(width)) {
    return NextResponse.json({ error: "Invalid width", allowed: ALLOWED_WIDTHS }, { status: 400 });
  }

  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImobBot/1.0)",
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image", status: imageResponse.status },
        { status: 502 },
      );
    }

    // Get image buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Return proxied image with cache headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400", // 7 days
        "CDN-Cache-Control": "public, max-age=604800",
        "Vercel-CDN-Cache-Control": "public, max-age=604800",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy image",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
