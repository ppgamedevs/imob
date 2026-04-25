import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getReportQualityTable,
  REPORT_QUALITY_FETCH_WINDOW,
  type ReportQualityPaidFilter,
  type ReportQualitySellabilityFilter,
  type ReportQualityConfidenceFilter,
} from "@/lib/admin/report-quality-table";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calitate rapoarte (vânzare)",
};

const STATUSES = [
  "all",
  "queued",
  "extracting",
  "normalizing",
  "scoring",
  "done",
  "error",
  "failed",
  "rejected_rental",
  "rejected_not_realestate",
] as const;

interface PageProps {
  searchParams: Promise<{
    sellability?: string;
    host?: string;
    confidence?: string;
    status?: string;
    paid?: string;
  }>;
}

export default async function AdminReportQualityPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const sellability = (sp.sellability as ReportQualitySellabilityFilter) || "all";
  const sourceHost = sp.host?.trim() ?? "";
  const confidence = (sp.confidence as ReportQualityConfidenceFilter) || "all";
  const status = sp.status && sp.status.length > 0 ? sp.status : "all";
  const paid = (sp.paid as ReportQualityPaidFilter) || "all";

  const rows = await getReportQualityTable({
    sellability: ["all", "strong", "okay", "weak", "do_not_sell"].includes(sellability)
      ? sellability
      : "all",
    sourceHost,
    confidence: ["all", "high", "medium", "low"].includes(confidence) ? confidence : "all",
    status,
    paid: ["all", "paid", "unpaid"].includes(paid) ? paid : "all",
  });

  const q = (key: string, value: string) => {
    const p = new URLSearchParams();
    p.set("sellability", (sp.sellability as string) || "all");
    p.set("host", (sp.host as string) || "");
    p.set("confidence", (sp.confidence as string) || "all");
    p.set("status", (sp.status as string) || "all");
    p.set("paid", (sp.paid as string) || "all");
    p.set(key, value);
    return `?${p.toString()}`;
  };

  return (
    <div className="container mx-auto max-w-[1400px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Calitate comercială — rapoarte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ultimele {rows.length} analize (după filtre), același calcul ca în produs:{" "}
            <code className="text-xs">buildReportSellability</code> +{" "}
            <code className="text-xs">buildReportDataQualityGate</code>. Fereastră maxim{" "}
            <code className="text-xs">{REPORT_QUALITY_FETCH_WINDOW}</code> rânduri apoi tăiat la
            100.
          </p>
        </div>
        <div className="flex flex-col gap-1 text-sm sm:items-end">
          <Link className="text-primary underline" href="/admin">
            Admin
          </Link>
          <Link className="text-muted-foreground underline" href="/admin/data-quality">
            Calitate date
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtre</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get" action="/admin/report-quality">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Sellability</span>
              <select
                name="sellability"
                defaultValue={sellability}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="all">toate</option>
                <option value="strong">strong</option>
                <option value="okay">okay</option>
                <option value="weak">weak</option>
                <option value="do_not_sell">do_not_sell</option>
              </select>
            </label>
            <label className="flex min-w-[160px] flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Host sursă (conține)</span>
              <input
                name="host"
                defaultValue={sourceHost}
                placeholder="e.g. imobiliare"
                className="rounded border border-border bg-background px-2 py-1.5 text-sm font-mono"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Încredere</span>
              <select
                name="confidence"
                defaultValue={confidence}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="all">toate</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Status</span>
              <select
                name="status"
                defaultValue={status}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Platit</span>
              <select
                name="paid"
                defaultValue={paid}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="all">toate</option>
                <option value="paid">plătit</option>
                <option value="unpaid">neplătit</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Aplică
            </button>
            <Link href="/admin/report-quality" className="text-xs text-muted-foreground underline">
              Resetează
            </Link>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1600px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="p-2 font-medium">analysisId</th>
              <th className="p-2 font-medium">host</th>
              <th className="p-2 font-medium">status</th>
              <th className="p-2 font-medium">title</th>
              <th className="p-2 font-medium tabular-nums">preț€</th>
              <th className="p-2 font-medium tabular-nums">mp</th>
              <th className="p-2 font-medium">cam</th>
              <th className="p-2 font-medium tabular-nums">comp</th>
              <th className="p-2 font-medium">conf</th>
              <th className="p-2 font-medium">sell</th>
              <th className="p-2 font-medium">paywall</th>
              <th className="p-2 font-medium">risc date</th>
              <th className="p-2 font-medium max-w-[100px]" title="matchMethod din explain.notarial">
                not. metodă
              </th>
              <th className="p-2 font-medium" title="canShow: afișat în raport public">
                not. arată
              </th>
              <th className="p-2 font-medium min-w-[100px]">not. supp</th>
              <th className="p-2 font-medium min-w-[120px]">not. motiv</th>
              <th className="p-2 font-medium tabular-nums" title="Total € dacă arată (display)">
                not. €
              </th>
              <th className="p-2 font-medium tabular-nums" title="EUR/m² dacă arată (display)">
                not. €/m²
              </th>
              <th className="p-2 font-medium tabular-nums" title="An grilă">
                not. an
              </th>
              <th className="p-2 font-medium" title="plauzibilitate notarial">
                not. impl
              </th>
              <th className="p-2 font-medium" title="încredere notarial scăzută">
                not. low
              </th>
              <th
                className="p-2 font-medium min-w-[120px] max-w-[200px]"
                title="Atenționare automată: sector_avg, sub 45% vs preț, eur/m², an grilă, valută/unitate"
              >
                not. QA
              </th>
              <th className="p-2 font-medium min-w-[140px]">lipsă câmpuri</th>
              <th className="p-2 font-medium">creat</th>
              <th className="p-2 font-medium">act</th>
              <th className="p-2 font-medium">plătit</th>
              <th className="p-2 font-medium">raport</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.analysisId}
                className={`border-b border-border/50 align-top ${
                  r.notarialRowSuspicious
                    ? "bg-amber-100/80 dark:bg-amber-950/40"
                    : ""
                }`}
              >
                <td className="p-2 font-mono text-xs whitespace-nowrap">{r.analysisId}</td>
                <td className="p-2 font-mono text-xs">{r.sourceHost}</td>
                <td className="p-2 text-xs">{r.status}</td>
                <td className="p-2 text-xs max-w-[200px]">
                  {r.title ? (
                    <span className="line-clamp-2" title={r.title}>
                      {r.title}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 text-xs tabular-nums">
                  {r.priceEur != null ? r.priceEur.toLocaleString("ro-RO") : "—"}
                </td>
                <td className="p-2 text-xs tabular-nums">
                  {r.areaM2 != null ? r.areaM2 : "—"}
                </td>
                <td className="p-2 text-xs tabular-nums">{r.rooms != null ? r.rooms : "—"}</td>
                <td className="p-2 text-xs tabular-nums">{r.compCount}</td>
                <td className="p-2 text-xs">{r.confidenceLevel ?? "—"}</td>
                <td className="p-2 text-xs font-medium">{r.sellability}</td>
                <td className="p-2 text-xs">{r.paywallShown ? "da" : "nu"}</td>
                <td className="p-2 text-xs">{r.reportQuality}</td>
                <td className="p-2 text-xs font-mono break-words" title={r.notarialMatchMethod ?? ""}>
                  {r.notarialMatchMethod ?? "—"}
                </td>
                <td className="p-2 text-xs">{r.notarialShown ? "da" : "nu"}</td>
                <td className="p-2 text-xs">{r.notarialSuppressed ? "da" : "—"}</td>
                <td
                  className="p-2 text-xs text-muted-foreground max-w-[160px] break-words"
                  title={r.notarialSuppressReason ?? ""}
                >
                  {r.notarialSuppressReason ?? "—"}
                </td>
                <td className="p-2 text-xs tabular-nums">
                  {r.notarialTotalEur != null
                    ? r.notarialTotalEur.toLocaleString("ro-RO")
                    : "—"}
                </td>
                <td className="p-2 text-xs tabular-nums">
                  {r.notarialEurM2 != null ? r.notarialEurM2.toLocaleString("ro-RO") : "—"}
                </td>
                <td className="p-2 text-xs tabular-nums">{r.notarialGridYear ?? "—"}</td>
                <td className="p-2 text-xs">{r.notarialImplausible ? "da" : "—"}</td>
                <td className="p-2 text-xs">{r.notarialMatchLowConfidence ? "da" : "—"}</td>
                <td className="p-2 text-xs">
                  {r.notarialSuspicionTags ? (
                    <span
                      className="inline-block rounded border border-amber-600/50 bg-amber-50 px-1.5 py-0.5 text-[10px] font-mono text-amber-950 dark:border-amber-500/50 dark:bg-amber-900/30 dark:text-amber-100"
                      title={r.notarialSuspicionTags}
                    >
                      {r.notarialSuspicionTags}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 text-xs text-muted-foreground">{r.missingFields}</td>
                <td className="p-2 text-xs whitespace-nowrap text-muted-foreground">
                  {r.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                </td>
                <td className="p-2 text-xs whitespace-nowrap text-muted-foreground">
                  {r.updatedAt.toISOString().slice(0, 19).replace("T", " ")}
                </td>
                <td className="p-2 text-xs">{r.paid ? "da" : "nu"}</td>
                <td className="p-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <Link className="text-primary underline" href={r.reportLink} target="_blank">
                      deschide
                    </Link>
                    {r.dataQualityAdminLink ? (
                      <Link
                        className="text-muted-foreground underline"
                        href={r.dataQualityAdminLink}
                      >
                        data-quality
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Niciun rând după filtre.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Query: ultimele {REPORT_QUALITY_FETCH_WINDOW} rânduri <code>Analysis</code> (ordonat{" "}
        <code>createdAt desc</code>), cu <code>extractedListing</code>, <code>featureSnapshot</code>,{" "}
        <code>scoreSnapshot</code> (inclusiv <code>explain</code> JSON) și deblocări plătite,{" "}
        <code>groupBy</code> pe <code>CompMatch</code>, apoi filtre în memorie; afișare max 100. Coloane
        notariale: citite din <code>scoreSnapshot.explain.notarial</code> (metodă, canShow, motiv,
        display € / €/m², an). Rândurile evidențiate (fundal chihlimbar) = semnal QA automat (ex.{" "}
        <code>sector_avg</code>, total grilă sub 45% din prețul anunțului, €/m² sub 400 în
        București/Ilfov apartament, an grilă în afara ferestrei actuale/an precedent, valută/unitate
        <code>unknown</code> când e setată în explain). Fără expunere în UI public. Link
        „data-quality” când vânzarea e riscantă (sellability weak/do_not_sell sau{" "}
        <code>reportQuality</code> insuf/weak).
      </p>
    </div>
  );
}
