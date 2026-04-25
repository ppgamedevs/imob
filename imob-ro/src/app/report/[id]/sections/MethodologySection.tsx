import { ReportDisclaimer } from "@/components/common/ReportDisclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  baselineEurM2?: number | null;
  adjustments?: Record<string, number> | null;
  compsCount?: number | null;
  outlierCount?: number | null;
}

export default function MethodologySection({ baselineEurM2, adjustments, compsCount, outlierCount }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metodologie estimare</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div>
          <div className="font-medium">Cum am calculat pretul estimat</div>
          <p className="text-muted-foreground mt-1">
            Am pornit de la mediana EUR/mp din zona ({baselineEurM2 ? `${baselineEurM2} EUR/mp` : "date din zona"})
            si am aplicat ajustari pentru etaj, an constructie, distanta la metrou si stare.
          </p>
        </div>

        {adjustments && Object.keys(adjustments).length > 0 && (
          <div>
            <div className="font-medium">Ajustari aplicate</div>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {Object.entries(adjustments).map(([key, val]) => (
                <li key={key} className="flex justify-between">
                  <span className="capitalize">{key}</span>
                  <span className={val >= 1 ? "text-green-600" : "text-red-600"}>
                    {val >= 1 ? "+" : ""}{Math.round((val - 1) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {compsCount != null && (
          <div className="text-muted-foreground">
            Bazat pe {compsCount} comparabile{outlierCount ? ` (${outlierCount} extreme excluse)` : ""}.
          </div>
        )}

        <div className="space-y-3 border-t pt-3 text-xs text-muted-foreground">
          <p>
            Rezultatul este o <strong className="font-medium text-foreground">estimare orientativă</strong> și un{" "}
            <strong className="font-medium text-foreground">semnal de piață</strong>, nu un preț „corect” sau
            garantat. Poate diferi de prețul real de tranzacționare; încrederea depinde de comparabile,
            localizare și completitudinea datelor din anunț.
          </p>
          <ReportDisclaimer />
        </div>
      </CardContent>
    </Card>
  );
}
