import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report leads (previzualizare)",
};

export default async function AdminReportLeadsPage() {
  await requireAdmin();

  const rows = await prisma.reportLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      consent: true,
      source: true,
      createdAt: true,
      analysisId: true,
      analysis: {
        select: {
          extractedListing: { select: { title: true } },
        },
      },
    },
  });

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="underline hover:text-foreground" href="/admin">
            Admin
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Report leads (email previzualizare)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adrese lăsate din rapoarte blocate; ultimii 200.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio înregistrare.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Data</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Acord</th>
                    <th className="pb-2 pr-4 font-medium">Raport</th>
                    <th className="pb-2 font-medium">Sursă</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {r.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">{r.consent ? "da" : "nu"}</td>
                      <td className="py-2 pr-4 max-w-[220px] truncate">
                        <Link
                          className="text-primary underline"
                          href={`/report/${r.analysisId}`}
                        >
                          {r.analysis.extractedListing?.title?.slice(0, 40) || r.analysisId}
                        </Link>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
