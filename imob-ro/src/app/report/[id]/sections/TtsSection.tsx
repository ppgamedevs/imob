import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  ttsBucket?: string | null;
  scoreDays?: number | null;
  minMonths?: number | null;
  maxMonths?: number | null;
  estimateMonths?: number | null;
}

export default function TtsSection({ ttsBucket, scoreDays, minMonths, maxMonths, estimateMonths }: Props) {
  const hasData = ttsBucket || scoreDays;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timp estimat pana la vanzare</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-2">
            {minMonths != null && maxMonths != null ? (
              <div className="text-2xl font-bold">
                {minMonths} - {maxMonths} luni
              </div>
            ) : estimateMonths != null ? (
              <div className="text-2xl font-bold">~{estimateMonths} luni</div>
            ) : scoreDays != null ? (
              <div className="text-2xl font-bold">~{scoreDays} zile</div>
            ) : null}
            {ttsBucket && (
              <div className="text-sm text-muted-foreground">
                Interval: {ttsBucket === "<30" ? "sub 30 zile" : ttsBucket === "90+" ? "peste 90 zile" : `${ttsBucket} zile`}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Estimare conservatoare bazata pe pretul cerut vs. mediana zonei, cerere si sezonalitate. Intervalul real poate varia.
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Date insuficiente.</div>
        )}
      </CardContent>
    </Card>
  );
}
