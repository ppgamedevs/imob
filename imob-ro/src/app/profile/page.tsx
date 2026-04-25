import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileReportPdfButton } from "@/components/profile/ProfileReportPdfButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { flags as appFlags } from "@/lib/flags";

export const dynamic = "force-dynamic";

function hostFromSourceUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

function confidenceFromExplain(explain: unknown): string | null {
  const o = explain as { confidence?: { level?: string } } | null | undefined;
  const lv = o?.confidence?.level;
  if (lv === "high") return "Încredere ridicată (date)";
  if (lv === "medium") return "Încredere medie (date)";
  if (lv === "low") return "Încredere redusă (date)";
  return null;
}

function formatPriceMinorRon(amountCents: number): string {
  return (amountCents / 100).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=" + encodeURIComponent("/profile"));
  }

  const requireAccountList = !appFlags.reportUnlockGuestCheckout;

  const [paidUnlocks, reports] = await Promise.all([
    prisma.reportUnlock.findMany({
      where: { userId: session.user.id, status: "paid" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        analysis: {
          include: {
            extractedListing: {
              select: {
                title: true,
                price: true,
                currency: true,
              },
            },
            scoreSnapshot: {
              select: { explain: true },
            },
          },
        },
      },
    }),
    prisma.analysis.findMany({
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
    }),
  ]);

  const paidIds = new Set(paidUnlocks.map((p) => p.analysisId));
  const reportsExcludingPaid = reports.filter((r) => !paidIds.has(r.id));
  const hasAnyContent = paidUnlocks.length > 0 || reportsExcludingPaid.length > 0;

  return (
    <div className="mx-auto max-w-[900px] px-5 py-12">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-950">Rapoartele mele</h1>
        <p className="mt-1 text-[15px] text-gray-500">
          Analizele din cont și rapoartele deblocate cu plata, într-un singur loc.
        </p>
        {requireAccountList ? (
          <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
            Deblocarea completă a rapoartelor este disponibilă doar cu cont; plățile individual se
            regăsesc sub „Rapoarte deblocate (plată)”.
          </p>
        ) : null}
      </div>

      {!hasAnyContent ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-gray-700 mb-1">Niciun raport încă</p>
            <p className="text-[13px] text-gray-500 mb-4">
              Analizează o proprietate sau deblochează un raport finalizat ca să apar aici.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center rounded-full bg-gray-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Analizează o proprietate
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {paidUnlocks.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Rapoarte deblocate (plată)</h2>
              <p className="text-sm text-gray-500 mb-4">Acces cumpărat; poți reveni la raport oricând.</p>
              <div className="space-y-3">
                {paidUnlocks.map((row) => {
                  const a = row.analysis;
                  const ext = a.extractedListing;
                  const title = ext?.title ?? a.sourceUrl;
                  const conf = confidenceFromExplain(a.scoreSnapshot?.explain);
                  const listPrice =
                    ext?.price != null
                      ? `${(ext.price as number).toLocaleString("ro-RO")} ${ext.currency ?? "EUR"}`
                      : "—";
                  return (
                    <Card key={row.id} className="border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold text-gray-900 break-words">
                              {String(title).slice(0, 200)}
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1 break-all">
                              Sursă: {hostFromSourceUrl(a.sourceUrl)}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="w-fit text-[10px] shrink-0 bg-emerald-50 text-emerald-800"
                          >
                            Deblocat
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                          <span>
                            <span className="text-gray-500">Preț anunț:</span> {listPrice}
                          </span>
                          <span>
                            <span className="text-gray-500">Plată deblocare:</span>{" "}
                            {formatPriceMinorRon(row.amountCents)} {row.currency}
                          </span>
                          <span>
                            <span className="text-gray-500">Deblocat la:</span>{" "}
                            {row.updatedAt.toLocaleString("ro-RO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {conf ? (
                          <p className="text-[13px] text-slate-600">
                            <span className="text-gray-500">Încredere (model):</span> {conf}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <Link
                            href={`/report/${a.id}`}
                            className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-800 underline-offset-2"
                          >
                            Deschide raportul
                          </Link>
                          <ProfileReportPdfButton analysisId={a.id} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : null}

          {requireAccountList && paidUnlocks.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Niciun raport deblocat cu plată încă</p>
              <p className="mt-1 text-amber-900/90 text-[13px] leading-relaxed">
                După ce deblochezi un raport finalizat (cu cont), îl vei vedea aici, cu acces
                complet și PDF.
              </p>
            </div>
          ) : null}

          {reportsExcludingPaid.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analize din cont</h2>
              <div className="space-y-3">
                {reportsExcludingPaid.map((report) => {
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
                        : "în procesare";

                  return (
                    <Link key={report.id} href={`/report/${report.id}`} className="block group">
                      <Card className="transition-all duration-200 hover:shadow-md hover:border-gray-300 group-hover:bg-gray-50/50">
                        <CardContent className="py-4 px-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {ext?.title ?? "Proprietate fără titlu"}
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
                                {ext?.rooms && (
                                  <span>
                                    {ext.rooms === 1 ? "garsonieră" : `${ext.rooms} camere`}
                                  </span>
                                )}
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
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
