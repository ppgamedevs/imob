import { prisma } from "@/lib/db";
import { BUYER_GUIDE_SLUGS } from "@/lib/seo/buyer-guides";
import { getIndexableDoneReportIdsForSitemap } from "@/lib/seo/report-page-indexing";

export const dynamic = "force-dynamic";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

export async function GET() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const now = new Date().toISOString().split("T")[0];

  const [indexableIds, areas] = await Promise.all([
    getIndexableDoneReportIdsForSitemap(5000),
    prisma.area.findMany({ select: { slug: true } }),
  ]);
  const metaRows =
    indexableIds.length > 0
      ? await prisma.analysis.findMany({
          where: { id: { in: indexableIds } },
          select: { id: true, updatedAt: true },
        })
      : [];
  const lastmodById = new Map(metaRows.map((r) => [r.id, r.updatedAt]));

  const entries: SitemapEntry[] = [
    { loc: `${base}/`, lastmod: now, changefreq: "daily", priority: "1.0" },
    { loc: `${base}/bucuresti`, lastmod: now, changefreq: "daily", priority: "0.9" },
    { loc: `${base}/discover`, lastmod: now, changefreq: "daily", priority: "0.8" },
    { loc: `${base}/estimare`, lastmod: now, changefreq: "weekly", priority: "0.9" },
    { loc: `${base}/vinde`, lastmod: now, changefreq: "weekly", priority: "0.8" },
    { loc: `${base}/pricing`, lastmod: now, changefreq: "monthly", priority: "0.7" },
    { loc: `${base}/raport-exemplu`, lastmod: now, changefreq: "monthly", priority: "0.8" },
    { loc: `${base}/cum-functioneaza`, lastmod: now, changefreq: "monthly", priority: "0.85" },
    { loc: `${base}/analyze`, lastmod: now, changefreq: "weekly", priority: "0.8" },
    { loc: `${base}/glosar`, lastmod: now, changefreq: "monthly", priority: "0.5" },
    { loc: `${base}/help`, lastmod: now, changefreq: "monthly", priority: "0.5" },
    { loc: `${base}/date-si-metodologie`, lastmod: now, changefreq: "monthly", priority: "0.75" },
    { loc: `${base}/how-we-estimate`, lastmod: now, changefreq: "monthly", priority: "0.6" },
    { loc: `${base}/despre`, lastmod: now, changefreq: "monthly", priority: "0.4" },
    { loc: `${base}/contact`, lastmod: now, changefreq: "monthly", priority: "0.4" },
    { loc: `${base}/developments`, lastmod: now, changefreq: "weekly", priority: "0.7" },
    { loc: `${base}/compare/areas`, lastmod: now, changefreq: "weekly", priority: "0.6" },
    { loc: `${base}/termeni`, lastmod: now, changefreq: "yearly", priority: "0.2" },
    { loc: `${base}/confidentialitate`, lastmod: now, changefreq: "yearly", priority: "0.2" },
    { loc: `${base}/cookies`, lastmod: now, changefreq: "yearly", priority: "0.2" },
    { loc: `${base}/prelucrare-date`, lastmod: now, changefreq: "yearly", priority: "0.2" },
    { loc: `${base}/ghid`, lastmod: now, changefreq: "weekly", priority: "0.85" },
  ];

  for (const g of BUYER_GUIDE_SLUGS) {
    entries.push({
      loc: `${base}/ghid/${encodeURIComponent(g)}`,
      lastmod: now,
      changefreq: "monthly" as const,
      priority: "0.8",
    });
  }

  for (const a of areas) {
    entries.push({
      loc: `${base}/zona/${encodeURIComponent(a.slug)}`,
      lastmod: now,
      changefreq: "daily",
      priority: "0.8",
    });
  }

  for (const rid of indexableIds) {
    const um = lastmodById.get(rid);
    entries.push({
      loc: `${base}/report/${rid}`,
      lastmod: um?.toISOString().split("T")[0] ?? now,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
