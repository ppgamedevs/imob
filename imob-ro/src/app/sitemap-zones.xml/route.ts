import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const areas = await prisma.area.findMany({
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  const now = new Date().toISOString().split("T")[0];

  const entries = areas.map(
    (a) => `  <url>
    <loc>${base}/zona/${a.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
