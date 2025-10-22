import { prisma } from "@/lib/db";

/**
 * Rebuilds provenance timeline from Sight history.
 * Detects: LISTED, PRICE_DROP, RELABEL, CONTACT_CHANGED events.
 *
 * @param analysisId - Analysis ID to rebuild timeline for
 */
export async function rebuildProvenance(analysisId: string): Promise<void> {
  const sights = await prisma.sight.findMany({
    where: { analysisId },
    orderBy: { seenAt: "asc" },
  });

  if (!sights.length) return;

  const events: Array<{
    kind: string;
    payload: unknown;
    happenedAt: Date;
  }> = [];

  // First sight = LISTED
  events.push({
    kind: "LISTED",
    payload: {
      domain: sights[0].domain,
      url: sights[0].sourceUrl,
    },
    happenedAt: sights[0].seenAt,
  });

  // Walk through sights, detect changes
  for (let i = 1; i < sights.length; i++) {
    const prev = sights[i - 1];
    const cur = sights[i];

    // Price change
    if (prev.priceEur && cur.priceEur && prev.priceEur !== cur.priceEur) {
      const delta = cur.priceEur - prev.priceEur;
      events.push({
        kind: "PRICE_DROP",
        payload: {
          from: prev.priceEur,
          to: cur.priceEur,
          delta,
        },
        happenedAt: cur.seenAt,
      });
    }

    // Title change
    if ((prev.title || "") !== (cur.title || "")) {
      events.push({
        kind: "RELABEL",
        payload: {
          from: prev.title,
          to: cur.title,
        },
        happenedAt: cur.seenAt,
      });
    }

    // Contact change
    if ((prev.contact || "") !== (cur.contact || "")) {
      events.push({
        kind: "CONTACT_CHANGED",
        payload: {
          from: prev.contact,
          to: cur.contact,
        },
        happenedAt: cur.seenAt,
      });
    }
  }

  // Persist (simple: delete all + recreate)
  await prisma.provenanceEvent.deleteMany({ where: { analysisId } });

  if (events.length > 0) {
    await prisma.provenanceEvent.createMany({
      data: events.map((e) => ({
        analysisId,
        kind: e.kind,
        payload: e.payload as never,
        happenedAt: e.happenedAt,
      })),
    });
  }
}
