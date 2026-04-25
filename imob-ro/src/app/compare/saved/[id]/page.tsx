import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

/**
 * Resolves a saved compare set to /compare/g1,g2,...
 * (The dynamic compare UI lives at /compare/[ids].)
 */
export default async function CompareSavedRedirectPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=" + encodeURIComponent(`/compare/saved/${id}`));
  }

  const row = await prisma.compareSet.findUnique({ where: { id } });
  if (!row || row.userId !== session.user.id) {
    redirect("/me/buyer");
  }

  const ids = row.groupIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length < 1) {
    redirect("/me/buyer");
  }

  redirect(`/compare/${ids.join(",")}`);
}
