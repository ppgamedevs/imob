import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

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
    revalidatePath(`/zona/${area.slug}`);
  }

  return Response.json({ ok: true, revalidated: topAreas.length });
}
