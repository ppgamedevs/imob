import { prisma } from "@/lib/db";

export async function GET() {
  const areas = await prisma.area.findMany({
    select: {
      slug: true,
    },
    orderBy: { slug: "asc" },
  });

  const now = new Date().toISOString();

  const entries = areas.map(
    (a) => `  <url>
    <loc>${process.env.NEXT_PUBLIC_APP_URL}/zona/${a.slug}</loc>
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
    },
  });
}
