import { revalidatePath } from "next/cache";

import { revalidateAllZones, revalidateZone } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";

const TOP_N = 40;

export async function GET(_req: Request) {
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
