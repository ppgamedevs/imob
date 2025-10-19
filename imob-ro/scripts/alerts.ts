/*
  scripts/alerts.ts
  - For each SavedAnalysis, check recent PriceHistory and extractedListing/comps
  - If price dropped >3% vs last saved price or a comp is cheaper than current price, send email
*/
import { PrismaClient } from "@prisma/client";

import { sendEmail } from "@/lib/email";

const prisma = new PrismaClient();

async function run() {
  const db = prisma as unknown as {
    savedAnalysis: {
      findMany: (
        args?: unknown,
      ) => Promise<Array<{ id: string; userId: string; analysisId: string }>>;
    };
    analysis: { findUnique: (args: unknown) => Promise<Record<string, unknown> | null> };
    priceHistory: { findMany: (args: unknown) => Promise<Array<{ price: number }>> };
  };

  const saved = await db.savedAnalysis.findMany();
  for (const s of saved) {
    try {
      const analysisRaw = (await db.analysis.findUnique({
        where: { id: s.analysisId },
        include: { extractedListing: true },
      })) as unknown;
      if (!analysisRaw) continue;
      const ar = analysisRaw as Record<string, unknown> | null;
      const extracted = (ar && (ar["extractedListing"] as Record<string, unknown> | null)) ?? null;
      const sourceUrl = ar ? (ar["sourceUrl"] as string | undefined) : undefined;
      const ph = await db.priceHistory.findMany({
        where: { sourceUrl: sourceUrl ?? undefined },
        orderBy: { ts: "desc" },
        take: 2,
      });
      if (ph && ph.length >= 2) {
        const latest = ph[0].price;
        const prev = ph[1].price;
        const drop = (prev - latest) / prev;
        if (drop > 0.03) {
          // notify user
          await sendEmail(
            s.userId,
            "Alert: price drop",
            `<p>Price dropped by ${(drop * 100).toFixed(1)}% for item you saved.</p>`,
          );
        }
      }

      // check comps (cheaper)
      const featureSnapshot = ar
        ? (ar["featureSnapshot"] as Record<string, unknown> | undefined)
        : undefined;
      const features = featureSnapshot
        ? (featureSnapshot["features"] as Record<string, unknown> | undefined)
        : undefined;
      const compsRaw = features ? (features["comps"] as unknown) : null;
      if (Array.isArray(compsRaw) && extracted && typeof extracted["price"] === "number") {
        const extractedPrice = extracted["price"] as number;
        for (const c of compsRaw as Array<unknown>) {
          if (!c || typeof c !== "object") continue;
          const comp = c as Record<string, unknown>;
          const compPrice = comp["price"] as unknown;
          if (typeof compPrice === "number" && compPrice < extractedPrice) {
            await sendEmail(
              s.userId,
              "Alert: cheaper comp",
              `<p>A comp is cheaper than the saved listing.</p>`,
            );
            break;
          }
        }

      // investor alert: undervalued vs area AVM + yield threshold
      try {
        const scoreSnapshot = ar ? (ar["scoreSnapshot"] as Record<string, unknown> | undefined) : undefined;
        const features = featureSnapshot ? (featureSnapshot["features"] as Record<string, unknown> | undefined) : undefined;
        const avmLow = scoreSnapshot ? (scoreSnapshot["avmLow"] as unknown) : undefined;
        const avmHigh = scoreSnapshot ? (scoreSnapshot["avmHigh"] as unknown) : undefined;
        const yieldNet = scoreSnapshot ? (scoreSnapshot["yieldNet"] as unknown) : undefined;
        const INVESTOR_YIELD = Number(process.env.INVESTOR_YIELD_THRESHOLD ?? 0.06);
        if (
          typeof extracted["price"] === "number" &&
          typeof avmHigh === "number" &&
          typeof yieldNet === "number"
        ) {
          const price = extracted["price"] as number;
          const avmMid = (Number(avmLow ?? 0) + Number(avmHigh ?? 0)) / 2;
          const undervalued = avmMid > 0 && price / avmMid < 0.9; // >10% undervalued
          if (undervalued && Number(yieldNet) > INVESTOR_YIELD) {
            await sendEmail(
              s.userId,
              "Alert investitor: oportunitate",
              `<p>Proprietate subevaluate față de zonă și randament estimat ${(Number(yieldNet) * 100).toFixed(2)}% &gt; ${(INVESTOR_YIELD * 100).toFixed(2)}%</p>`,
            );
          }
        }
      } catch (e) {
        // ignore investor alert failures
      }
      }
    } catch {
      console.warn("alerts: failed for saved", s.id);
    }
  }

  await prisma.$disconnect();
}

if (require.main === module)
  run().catch((_e) => {
    console.error(_e);
    process.exit(1);
  });
