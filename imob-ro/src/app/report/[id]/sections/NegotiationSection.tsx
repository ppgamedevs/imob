import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  overpricingPct?: number | null;
  yearBuilt?: number | null;
  daysOnMarket?: number | null;
  areaDaysMedian?: number | null;
  suggestedLow?: number | null;
  suggestedHigh?: number | null;
}

export default function NegotiationSection({
  overpricingPct,
  yearBuilt,
  daysOnMarket,
  areaDaysMedian,
  suggestedLow,
  suggestedHigh,
}: Props) {
  const arguments_: string[] = [];

  if (overpricingPct != null && overpricingPct > 3) {
    arguments_.push(
      `Pretul cerut este cu ${overpricingPct}% peste mediana zonei - exista spatiu de negociere.`,
    );
  }

  if (yearBuilt && yearBuilt < 1990) {
    arguments_.push(
      `Cladire din ${yearBuilt} - poate necesita investitii in renovare sau consolidare.`,
    );
  }

  if (daysOnMarket && areaDaysMedian && daysOnMarket > areaDaysMedian) {
    arguments_.push(
      `Anuntul e activ de ${daysOnMarket} zile, peste media zonei de ${areaDaysMedian} zile.`,
    );
  }

  if (arguments_.length === 0 && overpricingPct != null && overpricingPct <= 0) {
    arguments_.push("Pretul cerut este sub sau la nivelul medianei zonei - oferta competitiva.");
  }

  if (arguments_.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Argumente pentru negociere</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {arguments_.map((arg, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-bold">{i + 1}.</span>
              <span>{arg}</span>
            </li>
          ))}
        </ul>
        {suggestedLow != null && suggestedHigh != null && (
          <div className="mt-4 pt-3 border-t">
            <div className="text-sm text-muted-foreground">Interval de oferta sugerat</div>
            <div className="font-semibold">
              {suggestedLow.toLocaleString("ro-RO")} - {suggestedHigh.toLocaleString("ro-RO")} EUR
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Aceste argumente sunt generate automat pe baza datelor disponibile si au caracter orientativ.
        </p>
      </CardContent>
    </Card>
  );
}
