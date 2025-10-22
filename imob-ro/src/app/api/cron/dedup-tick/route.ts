import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { attachToGroup } from "@/lib/dedup/group";

export const runtime = "nodejs";

export async function GET() {
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
}
