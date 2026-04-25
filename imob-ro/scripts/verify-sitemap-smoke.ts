/**
 * Verificare ușoară: sitemap.xml e accesibil; intrările /report/ din eșantion
 * corespund analizelor cu status "done" în DB (criteriu din sitemap route).
 *
 *   pnpm run smoke:sitemap
 *   SMOKE_BASE_URL=https://imobintel.ro pnpm run smoke:sitemap
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const base = (
  process.env.SMOKE_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

function extractReportIds(xml: string, limit: number): string[] {
  const out: string[] = [];
  const re = /<loc>[^<]*\/report\/([^<\/]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < limit) {
    out.push(m[1].trim());
  }
  return out;
}

async function main() {
  const url = `${base}/sitemap.xml`;
  console.log("GET", url);
  const res = await fetch(url, { cache: "no-store" });
  const xml = await res.text();
  if (!res.ok) {
    console.error("HTTP", res.status);
    process.exit(1);
  }
  if (!xml.includes("<?xml") || !xml.includes("<urlset")) {
    console.error("Răspunsul nu arată a fi un sitemap XML");
    process.exit(1);
  }
  const reportIds = extractReportIds(xml, 20);
  console.log("Intrări /report/ din eșantion (până la 20):", reportIds.length);
  if (reportIds.length === 0) {
    console.log("OK (fără rapoarte listate; posibil fără analize 'done' în sitemap).");
    return;
  }
  const rows = await prisma.analysis.findMany({
    where: { id: { in: reportIds } },
    select: { id: true, status: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r.status]));
  let bad = 0;
  for (const id of reportIds) {
    const st = byId.get(id);
    if (st !== "done") {
      console.error(`  ✗ ${id}: DB status = ${st ?? "missing"}`);
      bad += 1;
    }
  }
  if (bad === 0) {
    console.log("OK: toate id-urile eșantionate au status=done (conform așteptărilor sitemap).");
  } else {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
