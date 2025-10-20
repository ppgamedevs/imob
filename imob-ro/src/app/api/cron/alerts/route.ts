import { NextResponse } from "next/server";

import { checkAlertsNow, markFired } from "@/lib/alerts-checker";
import { deliverNotifications } from "@/lib/notify";

export const runtime = "nodejs";

export async function GET() {
  const items = await checkAlertsNow();
  if (items.length) {
    await deliverNotifications(items);
    await Promise.all(items.map((i) => markFired(i.ruleId)));
  }
  return NextResponse.json({ ok: true, sent: items.length });
}
