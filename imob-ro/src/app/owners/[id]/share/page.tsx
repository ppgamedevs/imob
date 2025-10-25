import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { loadOwnerDashboard } from "@/lib/owner/load";

import { ShareViewClient } from "./share-view-client";

export const metadata = {
  title: "Estimare Proprietate | iR",
  description: "Vezi estimarea de valoare și Pre-Market Score",
};

export default async function OwnerSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  // Validate token
  const draft = await prisma.ownerDraft.findUnique({
    where: {
      analysisId: id,
      shareToken: token,
    },
  });

  if (!draft || draft.status === "draft") {
    notFound();
  }

  // Load dashboard data (without contact info)
  const data = await loadOwnerDashboard(id);

  if (!data) {
    notFound();
  }

  return <ShareViewClient data={data} />;
}
