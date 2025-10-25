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
  params: { id: string };
  searchParams: { token?: string };
}) {
  const { token } = searchParams;

  if (!token) {
    notFound();
  }

  // Validate token
  const draft = await prisma.ownerDraft.findUnique({
    where: {
      analysisId: params.id,
      shareToken: token,
    },
  });

  if (!draft || draft.status === "draft") {
    notFound();
  }

  // Load dashboard data (without contact info)
  const data = await loadOwnerDashboard(params.id);

  if (!data) {
    notFound();
  }

  return <ShareViewClient data={data} />;
}
