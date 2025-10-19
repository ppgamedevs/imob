import { prisma } from "@/lib/db";

export const runtime = "edge";

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
  urls.push(base + "/");
  urls.push(base + "/pricing");

  for (const a of areas) {
    urls.push(`${base}/area/${encodeURIComponent(a.slug)}`);
  }

  for (const r of analyses) {
    urls.push(`${base}/report/${r.id}`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`)
    .join("\n")}\n</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
