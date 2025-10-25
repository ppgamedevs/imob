import { notFound } from "next/navigation";

import { loadOwnerDashboard } from "@/lib/owner/load";

import { OwnerDashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Dashboard Proprietar | iR",
  description: "Valoare estimată, viteza vânzării și ROI fixes pentru proprietatea ta",
};

export default async function OwnerDashboardPage({ params }: { params: { id: string } }) {
  const data = await loadOwnerDashboard(params.id);

  if (!data) {
    notFound();
  }

  return <OwnerDashboardClient data={data} />;
}
