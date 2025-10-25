import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Find org by slug
  const org = await prisma.org.findFirst({
    where: {
      brand: {
        path: ["slug"],
        equals: slug,
      },
    },
  });

  if (!org) {
    notFound();
  }

  const brand = (org.brand as { color?: string; logoUrl?: string; slug?: string }) || {};

  // Get agent emails in this org
  const agents = await prisma.agentUser.findMany({
    where: { orgId: org.id },
    select: { email: true },
  });

  const agentEmails = agents.map((a) => a.email);

  // Get all analyses
  const items = await prisma.bulkAnalysisItem.findMany({
    where: {
      job: {
        agentEmail: {
          in: agentEmails,
        },
      },
      status: "done",
      analysisId: {
        not: null,
      },
    },
    include: {
      job: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const analysisIds = items
    .map((item) => item.analysisId)
    .filter((id): id is string => id !== null);

  const analyses = await prisma.analysis.findMany({
    where: {
      id: {
        in: analysisIds,
      },
    },
    include: {
      extractedListing: true,
      scoreSnapshot: true,
    },
  });

  const analysisMap = new Map(analyses.map((a) => [a.id, a]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div
        className="border-b border-white/10"
        style={{
          backgroundColor: brand.color ? `${brand.color}20` : "rgba(255,255,255,0.05)",
        }}
      >
        <div className="container max-w-7xl py-6">
          <div className="flex items-center gap-4">
            {brand.logoUrl && <img src={brand.logoUrl} alt={org.name} className="h-12 w-auto" />}
            <div>
              <h1 className="text-2xl font-bold">{org.name}</h1>
              <p className="text-sm text-gray-400">{analyses.length} proprietăți</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="container max-w-7xl py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const analysis = item.analysisId ? analysisMap.get(item.analysisId) : null;
            const listing = analysis?.extractedListing;
            const score = analysis?.scoreSnapshot;

            if (!listing) return null;

            return (
              <Link
                key={item.id}
                href={`/report/${item.analysisId}`}
                className="bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition"
              >
                {listing?.photos && Array.isArray(listing.photos) && listing.photos[0] && (
                  <div className="aspect-video relative">
                    <img
                      src={(listing.photos[0] as any).url || listing.photos[0]}
                      alt={listing.title || ""}
                      className="w-full h-full object-cover"
                    />
                    {score?.priceBadge && (
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant={score.priceBadge === "underpriced" ? "default" : "secondary"}
                        >
                          {score.priceBadge}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold mb-2 line-clamp-2">{listing.title}</h3>
                  <div className="text-2xl font-bold mb-2">
                    {listing.price ? `€${listing.price.toLocaleString()}` : "Contact for price"}
                  </div>
                  <div className="text-sm text-gray-400">
                    {listing.areaM2 ? `${listing.areaM2}m²` : ""}
                    {listing.rooms ? ` · ${listing.rooms} camere` : ""}
                    {listing.floor !== null && listing.floor !== undefined
                      ? ` · Et. ${listing.floor}`
                      : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Nicio proprietate disponibilă momentan</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-6 mt-12">
        <div className="container max-w-7xl text-center text-sm text-gray-500">
          Powered by{" "}
          <Link href="/" className="text-white hover:underline">
            imob.ro
          </Link>
        </div>
      </div>
    </div>
  );
}
