import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const reports = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      extractedListing: {
        select: {
          title: true,
          price: true,
          currency: true,
          areaM2: true,
          rooms: true,
          addressRaw: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[900px] px-5 py-12">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-950">
          Rapoartele mele
        </h1>
        <p className="mt-1 text-[15px] text-gray-500">
          Toate analizele tale sunt salvate si pot fi accesate oricand.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-gray-700 mb-1">Niciun raport inca</p>
            <p className="text-[13px] text-gray-500 mb-4">
              Analizeaza prima ta proprietate pentru a vedea raportul aici.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center rounded-full bg-gray-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Analizeaza o proprietate
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const ext = report.extractedListing;
            const statusColor =
              report.status === "done"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : report.status === "error"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";
            const statusLabel =
              report.status === "done"
                ? "Finalizat"
                : report.status === "error"
                  ? "Eroare"
                  : "In procesare";

            return (
              <Link key={report.id} href={`/report/${report.id}`} className="block group">
                <Card className="transition-all duration-200 hover:shadow-md hover:border-gray-300 group-hover:bg-gray-50/50">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {ext?.title ?? "Proprietate fara titlu"}
                        </h3>
                        <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                          {ext?.addressRaw ?? report.sourceUrl}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[12px] text-gray-500">
                          {ext?.price && (
                            <span className="font-medium text-gray-700">
                              {ext.price.toLocaleString("ro-RO")} {ext.currency ?? "EUR"}
                            </span>
                          )}
                          {ext?.areaM2 && <span>{ext.areaM2} mp</span>}
                          {ext?.rooms && <span>{ext.rooms === 1 ? "garsoniera" : `${ext.rooms} camere`}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium border ${statusColor}`}
                        >
                          {statusLabel}
                        </Badge>
                        <span className="text-[11px] text-gray-400">
                          {new Date(report.createdAt).toLocaleDateString("ro-RO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
