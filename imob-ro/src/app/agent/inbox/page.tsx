import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AgentInboxPage() {
  const session = await auth();
  if (!session?.user?.id) return <div className="p-6">Autentifică-te.</div>;

  const leads = await prisma.lead.findMany({
    where: { assignedTo: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Lead-urile mele</h1>
      <div className="mt-4 space-y-2">
        {}
        {leads.map((l: any) => (
          <div key={l.id} className="border rounded-xl p-3 text-sm">
            <div className="flex justify-between">
              <div className="font-medium">
                {l.name} ·{" "}
                <a className="underline" href={`mailto:${l.email}`}>
                  {l.email}
                </a>
                {l.phone ? ` · ${l.phone}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {l.createdAt.toLocaleString("ro-RO")}
              </div>
            </div>
            <div className="mt-1">{l.message || "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Sursă: {l.source ?? "—"} ·{" "}
              <Link className="underline" href={`/report/${l.analysisId}`}>
                raport
              </Link>
            </div>
          </div>
        ))}
        {!leads.length ? (
          <div className="text-sm text-muted-foreground">Încă nu ai lead-uri.</div>
        ) : null}
      </div>
    </div>
  );
}
