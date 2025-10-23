/**
 * Day 29: Saved Search Server Actions
 * Create, list, delete saved searches
 */

"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { SavedQuerySchema } from "@/lib/saved-search/validate";
import { revalidatePath } from "next/cache";

export async function createSavedSearchAction(name: string, q: any) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  const query = SavedQuerySchema.parse(q);

  const row = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: name || null,
      queryJson: query as any,
    },
  });

  revalidatePath("/me/buyer");
  return { ok: true, id: row.id };
}

export async function deleteSavedSearchAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Verify ownership
  const existing = await prisma.savedSearch.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Not found");
  }

  await prisma.savedSearch.delete({ where: { id } });

  revalidatePath("/me/buyer");
  return { ok: true };
}

export async function listSavedSearchesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { searches: [] };
  }

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return {
    searches: searches.map((s) => ({
      id: s.id,
      name: s.name,
      query: s.queryJson,
      lastRunAt: s.lastRunAt,
      createdAt: s.createdAt,
    })),
  };
}
