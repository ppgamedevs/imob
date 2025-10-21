"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function claimListing(analysisId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");
  const ap = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!ap) throw new Error("Nu ai profil de agent. Creează-l la /agent/setup");

  // dacă deja există pending/approved, evită duplicat
  const exists = await prisma.listingClaim.findFirst({
    where: {
      analysisId,
      agentId: ap.id,
      status: { in: ["pending", "approved"] },
    },
  });
  if (exists) return { ok: true, status: exists.status };

  await prisma.listingClaim.create({
    data: { analysisId, agentId: ap.id, status: "pending" },
  });
  return { ok: true, status: "pending" };
}

export async function decideClaim(claimId: string, decision: "approved" | "rejected") {
  // simplu: doar owner-ul listingului sau un admin poate decide
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");

  const claim = await prisma.listingClaim.findUnique({
    where: { id: claimId },
    include: { analysis: true },
  });
  if (!claim) throw new Error("Not found");
  if (claim.analysis.userId !== session.user.id) throw new Error("forbidden");

  const updated = await prisma.listingClaim.update({
    where: { id: claimId },
    data: {
      status: decision,
      decidedAt: new Date(),
      decidedBy: session.user.id,
    },
  });
  return { ok: true, status: updated.status };
}
