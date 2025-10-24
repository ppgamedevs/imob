import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { revalidateZone, revalidateAllZones } from "@/lib/cache-tags";

const TOP_N = 40;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topAreas = await prisma.area.findMany({
    orderBy: { slug: "asc" },
    take: TOP_N,
    select: { slug: true },
  });

  for (const area of topAreas) {
    // Revalidate both path and tag for granular control
    revalidatePath(`/zona/${area.slug}`);
    await revalidateZone(area.slug);
  }

  // Also revalidate all zones tag
  await revalidateAllZones();

  return Response.json({ ok: true, revalidated: topAreas.length });
}
