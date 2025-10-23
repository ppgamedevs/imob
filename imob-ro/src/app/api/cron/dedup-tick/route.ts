import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { attachToGroup } from "@/lib/dedup/group";
import { withCronTracking } from "@/lib/obs/cron-tracker";

export const runtime = "nodejs";

export const GET = withCronTracking("dedup-tick", async () => {
  // Process latest analyses without groupId
  const list = await prisma.analysis.findMany({
    where: { groupId: null },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  for (const a of list) {
    await attachToGroup(a.id);
  }
  return NextResponse.json({ ok: true, processed: list.length });
});
