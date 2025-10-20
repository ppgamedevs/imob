"use server";

import { auth } from "@/lib/auth";
import { createAlertRule } from "@/lib/alerts";
// AlertType intentionally not needed here to avoid unused-import linting

export async function createPriceBelowAlert(analysisId: string, thresholdEur: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");
  await createAlertRule({
    userId: session.user.id,
    type: "PRICE_BELOW",
    analysisId,
    params: { thresholdEur },
  });
  return { ok: true };
}

export async function createUnderpricedAlert(analysisId: string, underPct = 0.05) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");
  await createAlertRule({
    userId: session.user.id,
    type: "UNDERPRICED",
    analysisId,
    params: { underpricedPct: underPct },
  });
  return { ok: true };
}
