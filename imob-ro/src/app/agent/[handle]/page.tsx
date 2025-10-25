import { prisma } from "@/lib/db";

export default async function AgentPublicPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const agent = await prisma.agentProfile.findUnique({
    where: { handle },
  });
  if (!agent) return <div className="p-6">Agent inexistent.</div>;

  // listări revendicate (approved)
  const claims = await prisma.listingClaim.findMany({
    where: { agentId: agent.id, status: "approved" },
    include: {
      analysis: {
        include: { extractedListing: true, featureSnapshot: true, scoreSnapshot: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-4">
        {agent.avatarUrl ? (
          <img src={agent.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted" />
        )}
        <div>
          <h1 className="text-xl font-semibold">{agent.fullName}</h1>
          <div className="text-sm text-muted-foreground">
            {agent.agencyName ?? "Agent independent"} {agent.verified ? "· ✓ verificat" : ""}
          </div>
          {agent.websiteUrl ? (
            <a className="text-xs underline" href={agent.websiteUrl} target="_blank">
              website
            </a>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Listări</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {}
          {claims.map((c: any) => {
            const a = c.analysis;
            const photos = Array.isArray(a.extractedListing?.photos)
              ? (a.extractedListing?.photos as any[])
              : [];

            const f: any = a.featureSnapshot?.features ?? {};
            return (
              <a
                key={c.id}
                href={`/report/${a.id}`}
                className="border rounded-xl p-2 hover:shadow transition"
              >
                {photos[0] ? (
                  <img src={photos[0]} className="h-32 w-full object-cover rounded" alt="" />
                ) : (
                  <div className="h-32 w-full bg-muted rounded" />
                )}
                <div className="mt-2 text-sm">
                  <div className="font-medium line-clamp-1">
                    {a.extractedListing?.title ?? "Anunț"}
                  </div>
                  <div>
                    {(f?.priceEur ?? 0).toLocaleString("ro-RO")} € · {f?.areaM2 ?? "—"} m²
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
