import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  yieldGross: number | null;
  yieldNet: number | null;
  rentEur: number | null;
  currency: string;
  /** From data-quality gate: hide numeric yield when model did not output stable gross+net. */
  canShowYield?: boolean;
};

/**
 * Chirii și randament doar când modelul a produs cifre reale. Fără fabricat.
 */
export default function BuyerInvestmentSection({
  yieldGross,
  yieldNet,
  rentEur,
  currency,
  canShowYield: canShowYieldProp,
}: Props) {
  const fromModel =
    yieldGross != null && Number.isFinite(yieldGross) && yieldGross > 0 && yieldGross < 2;
  const showYields = canShowYieldProp === false ? false : fromModel;
  // gross yield is a ratio e.g. 0.04 to 0.12 typically; guard absurd values

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Perspectivă investiție (chirie, randament)</CardTitle>
        <CardDescription>
          Estimare din model, nu contract de închiriere. Poate rata piața reală.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm leading-relaxed text-slate-700">
        {showYields ? (
          <>
            {rentEur != null && rentEur > 0 && (
              <p>
                Chirie lună (estimare):{" "}
                <span className="font-semibold tabular-nums text-slate-900">
                  {Math.round(rentEur).toLocaleString("ro-RO")} {currency}
                </span>
                .
              </p>
            )}
            <p>
              Randament brut estimat:{" "}
              <span className="font-semibold text-slate-900">
                {(yieldGross! * 100).toFixed(1)}%
              </span>
              {yieldNet != null && Number.isFinite(yieldNet) && yieldNet > 0 && (
                <>
                  {" "}
                  · net estimat:{" "}
                  <span className="font-semibold text-slate-900">
                    {(yieldNet * 100).toFixed(1)}%
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-slate-500">
              Include ipoteze despre costuri, goluri, întreținere: tratează cifrele ca simulare, nu
              promisiune.
            </p>
          </>
        ) : (
          <p>
            Nu avem suficiente date stabile în acest raport ca să afișăm un randament de încredere. Poți
            compara chirii medii de zonă pe alte surse; nu am inventa aici cifre doar de completat
            tabelul.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
