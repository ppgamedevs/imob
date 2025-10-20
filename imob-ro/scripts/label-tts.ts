#!/usr/bin/env ts-node
/*
  scripts/label-tts.ts

  Derive time-to-sell labels for analyses:
  - For each Analysis with a sourceUrl, fetch the URL and look for signs it was marked sold or is inaccessible (404/410/other non-200).
  - If marked sold or inaccessible, compute days = difference between Analysis.createdAt (or price history first seen) and the date detected (use fetch response date or now).
  - If still active (200 and not marked sold), censor the label at 120 days: store days = 120 and censored = true.
  - Persist to TtsLabel(analysisId, days, censored) and be idempotent (skip if existing matching entry exists).

  Notes:
  - This is a heuristic: "marked sold" detection looks for common words like "vândut", "vandut", "sold", "vândut" (diacritics) and status labels in HTML.
  - Run with: pnpm --dir . ts-node ./scripts/label-tts.ts
*/

import "dotenv/config";

import { prisma } from "../src/lib/db";

const MAX_CENSOR = 120; // days

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function looksLikeSold(html: string) {
  const txt = html.toLowerCase();
  // Romanian and English common indicators
  const soldTerms = [
    "vândut",
    "vândută",
    "vandut",
    "vanduta",
    "vindut",
    "vândută",
    "sold",
    "s-a-vândut",
    "s a vandut",
    "s-a vândut",
    "s a vândut",
    "accepted offer",
  ];
  return soldTerms.some((t) => txt.includes(t));
}

async function detectStatusForUrl(url: string) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const status = res.status;
    const text = await res.text();
    const now = new Date();

    if (status === 404 || status === 410) {
      return { state: "inaccessible", when: now, html: text } as const;
    }

    // Some sites return 200 but show a "sold" label in HTML
    if (status === 200) {
      if (looksLikeSold(text)) return { state: "sold", when: now, html: text } as const;
      return { state: "active", when: now, html: text } as const;
    }

    // treat other non-2xx as inaccessible
    if (status < 200 || status >= 300)
      return { state: "inaccessible", when: now, html: text } as const;

    return { state: "active", when: now, html: text } as const;
  } catch (err) {
    return { state: "inaccessible", when: new Date(), html: "" } as const;
  }
}

async function run() {
  console.log("Starting TTS labeling...");

  // Pull analyses that have a sourceUrl and don't already have a tts label
  const analyses = await prisma.analysis.findMany({
    where: {
      sourceUrl: { not: undefined },
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });

  console.log(`Found ${analyses.length} analyses with sourceUrl`);

  for (const a of analyses) {
    try {
      // prisma client hasn't been regenerated in this environment; use a safe cast to any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (prisma as any).ttsLabel.findUnique({ where: { analysisId: a.id } });
      if (existing) {
        // skip existing
        continue;
      }

      if (!a.sourceUrl) continue;
      console.log("Processing", a.id, a.sourceUrl);
      const result = await detectStatusForUrl(a.sourceUrl);

      let days: number;
      let censored = false;

      if (result.state === "sold" || result.state === "inaccessible") {
        days = daysBetween(a.createdAt, result.when);
        if (days > MAX_CENSOR) {
          days = MAX_CENSOR;
          censored = true;
        }
      } else {
        // active -> censor at MAX_CENSOR
        days = MAX_CENSOR;
        censored = true;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).ttsLabel.create({ data: { analysisId: a.id, days, censored } });
      console.log(`Inserted TtsLabel for ${a.id} days=${days} censored=${censored}`);
    } catch (err) {
      console.error("failed for analysis", a.id, err);
    }
  }

  await prisma.$disconnect();
  console.log("TTS labeling finished.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
