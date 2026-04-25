import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  averageCompDistanceM,
  buildComparabilityCriteriaLinesRo,
  isSafeHttpUrl,
  medianEurM2FromCompRows,
  roHeadlineCompsFound,
  roPriceM2VsCompMedian,
  roWeakCompsWarning,
  subjectAskingEurM2,
  pctAskingEurM2VsMedian,
} from "@/lib/report/comps-section-metrics";
import { AlertTriangle, Info } from "lucide-react";

import CompsClientBlock from "../CompsClientBlock";
import type { CompItem } from "../CompsCarousel";

type ReportCompsSectionProps = {
  comps: CompItem[];
  center: { lat?: number | null; lng?: number | null };
  /** Median €/m² from fair range (preferred) or from comp rows. */
  medianEurM2: number | null;
  subjectAskingPriceEur: number | null;
  subjectAreaM2: number | null;
  subjectRooms: number | null;
  areaSlug: string | null;
  city: string | null;
  hasSubjectCoords: boolean;
  /** Pipeline / explainer: confidence level for comps match */
  reportConfidenceLabelRo: string;
  reportConfidenceLevel: "high" | "medium" | "low" | string | null | undefined;
  /** e.g. report strip explanation */
  reportConfidenceShortRo?: string;
};

export default function ReportCompsSection({
  comps,
  center,
  medianEurM2: medianEurM2Prop,
  subjectAskingPriceEur,
  subjectAreaM2,
  subjectRooms,
  areaSlug,
  city,
  hasSubjectCoords,
  reportConfidenceLabelRo,
  reportConfidenceLevel,
  reportConfidenceShortRo,
}: ReportCompsSectionProps) {
  const n = comps.length;
  const fromRows = medianEurM2FromCompRows(comps.map((c) => c.eurM2));
  const medianEurM2 = medianEurM2Prop ?? fromRows;
  const askingEurM2 = subjectAskingEurM2(subjectAskingPriceEur, subjectAreaM2);
  const pctDiff =
    askingEurM2 != null && medianEurM2 != null && medianEurM2 > 0
      ? pctAskingEurM2VsMedian(askingEurM2, medianEurM2)
      : null;
  const avgD = averageCompDistanceM(comps.map((c) => c.distanceM));
  const criteria = buildComparabilityCriteriaLinesRo({
    hasSubjectCoords,
    subjectRooms,
    areaSlug: areaSlug?.trim() || null,
    city: city?.trim() || null,
    averageDistanceM: avgD,
  });
  const confidenceIsLow = reportConfidenceLevel === "low" || n < 3;
  const weakMsg = roWeakCompsWarning(n, confidenceIsLow);
  const priceLine = roPriceM2VsCompMedian(
    pctDiff,
    askingEurM2 != null && medianEurM2 != null,
  );

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
      <CardHeader className="pb-2 space-y-2">
        <CardTitle className="text-base">Comparabile (anunțuri, nu tranzacții)</CardTitle>
        <div className="space-y-3 text-sm text-muted-foreground">
            {n > 0 ? (
              <p className="font-medium text-slate-900 leading-snug">{roHeadlineCompsFound(n)}</p>
            ) : (
              <p>
                Nu avem o listă suficientă de anunțuri comparabile apropiate. Fără un set rezonabil
                de anunțuri, orice medie €/m² e mai volatilă — acest raport o marchează onest.
              </p>
            )}

            {n > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  De ce sunt comparabile
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 leading-relaxed pl-0.5">
                  {criteria.map((line, i) => (
                    <li key={i} className="marker:text-slate-400">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {n > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                    Mediană €/m² (anunțuri comparabile)
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-slate-900">
                    {medianEurM2 != null
                      ? `${Math.round(medianEurM2).toLocaleString("ro-RO")} EUR/m²`
                      : "— (date insuficiente)"}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                    Preț cerut / m² (anunțul tău)
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-slate-900">
                    {askingEurM2 != null
                      ? `${Math.round(askingEurM2).toLocaleString("ro-RO")} EUR/m²`
                      : "— (lipsește preț sau suprafață)"}
                  </div>
                </div>
              </div>
            )}

            {priceLine && n > 0 && (
              <p className="text-sm text-slate-800 bg-blue-50/80 border border-blue-100 rounded-lg px-3 py-2">
                {priceLine}
              </p>
            )}

            {weakMsg && (
              <div
                className="flex gap-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-amber-950 text-sm"
                role="status"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span>{weakMsg}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span className="font-medium text-slate-700">{reportConfidenceLabelRo}</span>
              {reportConfidenceShortRo ? <span>· {reportConfidenceShortRo}</span> : null}
              <span>· Nu inferăm cumpărări reale, doar anunțuri; mediana e o comparație între oferte, nu o «tranzacție».</span>
            </p>
          </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {n > 0 && (
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2">Anunț</th>
                  <th className="px-3 py-2 text-right">Preț</th>
                  <th className="px-3 py-2 text-right">m²</th>
                  <th className="px-3 py-2 text-right">€/m²</th>
                  <th className="px-3 py-2 text-right">Distanță</th>
                  <th className="px-3 py-2 w-24">Sursă</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => {
                  const hrefOk = isSafeHttpUrl(c.sourceUrl);
                  const eurM2c = c.eurM2 != null ? Math.round(c.eurM2) : null;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <span className="line-clamp-2 text-slate-900" title={c.title ?? ""}>
                          {c.title || "Anunț comparabil"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                        {c.priceEur != null
                          ? `${c.priceEur.toLocaleString("ro-RO")} €`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                        {c.areaM2 != null ? `${c.areaM2} m²` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                        {eurM2c != null ? `${eurM2c} €/m²` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 text-xs">
                        {c.distanceM != null ? `${c.distanceM} m` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {hrefOk && c.sourceUrl ? (
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium text-xs underline-offset-2 hover:underline"
                          >
                            Deschide
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400" title="Link indisponibil">
                            Link indisponibil
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {n > 0 ? (
          <>
            <div className="md:hidden">
              <CompsClientBlock comps={comps} center={center} listMode="full" />
            </div>
            <div className="hidden md:block">
              <CompsClientBlock comps={comps} center={center} listMode="map" />
            </div>
          </>
        ) : null}
        {!n ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-amber-950">
            <p className="font-medium">Căutare comparabile</p>
            <p className="mt-1 text-amber-900/90 text-xs leading-relaxed">
              Poți reîncerca analiza mai târziu când apar alte anunțuri în baza de date, sau adaugă
              manual câteva anunțuri apropiate la negociere. Nu forțăm cifre doar de umplut pagina.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
