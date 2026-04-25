/**
 * Ultimele deblocări plătite (ReportUnlock) — verificare rapidă DB.
 *
 *   pnpm run smoke:unlocks
 *   (necesită DATABASE_URL, ca și celelalte scripturi Prisma)
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [paidRecent, paid24h, pending] = await Promise.all([
    prisma.reportUnlock.findMany({
      where: { status: "paid" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        analysisId: true,
        amountCents: true,
        currency: true,
        status: true,
        updatedAt: true,
        stripeSessionId: true,
        email: true,
      },
    }),
    prisma.reportUnlock.count({
      where: {
        status: "paid",
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.reportUnlock.count({ where: { status: "pending" } }),
  ]);

  console.log("\n=== ReportUnlock: ultimele plătite (max 8)\n");
  if (paidRecent.length === 0) {
    console.log("  (niciun rând plătit găsit)");
  } else {
    for (const r of paidRecent) {
      const ron = (r.amountCents / 100).toLocaleString("ro-RO");
      console.log(
        `  ${r.updatedAt.toISOString().slice(0, 19)}Z | ${r.id.slice(0, 12)}… | ${r.analysisId.slice(0, 12)}… | ${ron} ${r.currency} | email:${r.email ? "da" : "nu"}`,
      );
    }
  }
  console.log(`\nPlăți 24h: ${paid24h} | Pending checkout: ${pending}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
