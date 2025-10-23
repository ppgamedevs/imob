/**
 * Day 29: Compare Server Actions
 * Create and manage property comparison sets
 */

"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCompareSetAction(groupIds: string[], name?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  if (!groupIds?.length || groupIds.length > 4) {
    throw new Error("Invalid group count (max 4)");
  }

  const row = await prisma.compareSet.create({
    data: {
      userId: session.user.id,
      groupIds: groupIds.join(","),
      name: name ?? null,
    },
  });

  return { ok: true, id: row.id };
}

export async function deleteCompareSetAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  // Verify ownership
  const existing = await prisma.compareSet.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Not found");
  }

  await prisma.compareSet.delete({ where: { id } });

  revalidatePath("/me/buyer");
  return { ok: true };
}

export async function listCompareSetsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { sets: [] };
  }

  const sets = await prisma.compareSet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    sets: sets.map((s) => ({
      id: s.id,
      name: s.name,
      groupIds: s.groupIds.split(",").filter(Boolean),
      createdAt: s.createdAt,
    })),
  };
}
