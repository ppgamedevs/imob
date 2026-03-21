import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { SectionTrustFooter } from "./ReportClarityBadge";

interface Props {
  ttsBucket?: string | null;
  scoreDays?: number | null;
  minMonths?: number | null;
  maxMonths?: number | null;
  estimateMonths?: number | null;
}

export default function TtsSection({
  ttsBucket,
  scoreDays,
  minMonths,
  maxMonths,
  estimateMonths,
}: Props) {
  const hasData = !!(ttsBucket || scoreDays || minMonths != null || estimateMonths != null);

  const rangeLabel =
    ttsBucket === "<30"
      ? "sub 30 zile"
      : ttsBucket === "90+"
        ? "peste 90 zile"
        : ttsBucket
          ? `${ttsBucket} zile`
          : null;

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cat de repede s-ar putea vinde ceva similar?</CardTitle>
        <CardDescription>
          Model ~ estimat din pret vs mediana zonei si sezonalitate — nu e promisiune de lichiditate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-3">
            {minMonths != null && maxMonths != null ? (
              <div className="text-2xl font-bold tabular-nums">
                {minMonths}–{maxMonths} luni <span className="text-sm font-medium text-muted-foreground">(~)</span>
              </div>
            ) : estimateMonths != null ? (
              <div className="text-2xl font-bold tabular-nums">
                ~{estimateMonths} luni
              </div>
            ) : scoreDays != null ? (
              <div className="text-2xl font-bold tabular-nums">~{scoreDays} zile</div>
            ) : null}
            {rangeLabel && (
              <p className="text-sm text-muted-foreground">Bucket: {rangeLabel}</p>
            )}
            <SectionTrustFooter
              whatThisMeans="Lichiditatea reala depinde de pret, prezentare si momentul pietei — foloseste ca reper, nu ca garantie."
              nextStep="Daca vinzi similar, compara cu 2–3 tranzactii recente din bloc sau strada, nu doar cu acest interval."
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Nu avem inca un interval TTS pentru acest anunt.</p>
            <SectionTrustFooter
              whatThisMeans="Fara acest semnal, nu poti evalua graba vanzatorului doar din raport."
              nextStep="Intreba la vizionare de cand e pe piata si daca a mai fost redus pretul."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
