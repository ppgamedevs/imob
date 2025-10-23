import { prisma } from "@/lib/db";

// Day 30: ISR revalidation
export const revalidate = 3600; // 1 hour

export async function GET() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // collect public reports (analyses that are completed and not private)
  const analyses = await prisma.analysis.findMany({
    where: { status: "completed" },
    select: { id: true },
  });

  // collect areas for zone pages
  const areas = await prisma.area.findMany({ select: { slug: true } });

  const urls: string[] = [];
  // Day 30: Add home and main pages
  urls.push(base + "/");
  urls.push(base + "/bucuresti"); // Day 30: City page
  urls.push(base + "/pricing");
  urls.push(base + "/discover");
  urls.push(base + "/search");

  // Day 30: Fixed URLs - use /zona/ instead of /area/
  for (const a of areas) {
    urls.push(`${base}/zona/${encodeURIComponent(a.slug)}`);
  }

  for (const r of analyses) {
    urls.push(`${base}/report/${r.id}`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u, i) => {
      // Day 30: Better changefreq based on page type
      const isZone = u.includes("/zona/");
      const isBucharest = u.includes("/bucuresti");
      const changefreq = isBucharest ? "hourly" : isZone ? "daily" : "weekly";
      const priority = i === 0 ? "1.0" : isBucharest || isZone ? "0.8" : "0.6";
      return `<url><loc>${u}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
    })
    .join("\n")}\n</urlset>`;

  // Day 30: Add cache headers
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
