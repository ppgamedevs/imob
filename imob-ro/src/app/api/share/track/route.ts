import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Privacy-preserving IP hash (keeps only /24 prefix, hashed).
 */
async function ipHash(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  // Keep only /24 prefix for privacy
  const p24 = ip.split(".").slice(0, 3).join(".");

  // Hash with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(p24);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";

  if (slug) {
    const ip = await ipHash(req);
    const ref = req.headers.get("referer") || "";
    const ua = req.headers.get("user-agent") || "";

    // Get analysisId from shortlink (best effort)
    const sl = await prisma.shortLink
      .findUnique({
        where: { slug },
        select: { analysisId: true },
      })
      .catch(() => null);

    // Create ShareEvent (best effort, non-blocking)
    await prisma.shareEvent
      .create({
        data: {
          slug,
          analysisId: sl?.analysisId || "",
          referrer: ref,
          ua,
          ipHash: ip,
        },
      })
      .catch(() => {});

    // Upsert ShareDaily (best effort)
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    await prisma.shareDaily
      .upsert({
        where: { slug_date: { slug, date: d } },
        update: { views: { increment: 1 } },
        create: { slug, date: d, views: 1, uniques: 0 },
      })
      .catch(() => {});
  }

  // Return 1x1 transparent GIF
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

  return new Response(gif, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
