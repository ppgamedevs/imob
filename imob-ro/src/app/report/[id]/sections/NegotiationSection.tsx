import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  overpricingPct?: number | null;
  yearBuilt?: number | null;
  daysOnMarket?: number | null;
  areaDaysMedian?: number | null;
  suggestedLow?: number | null;
  suggestedHigh?: number | null;
  floor?: number | null;
  hasElevator?: boolean | null;
  hasParking?: boolean | null;
  areaM2?: number | null;
  rooms?: number | null;
  compsCount?: number | null;
  seismicRisk?: boolean;
  eurPerM2?: number | null;
  zoneMedianEurM2?: number | null;
}

export default function NegotiationSection({
  overpricingPct,
  yearBuilt,
  daysOnMarket,
  areaDaysMedian,
  suggestedLow,
  suggestedHigh,
  floor,
  hasElevator,
  hasParking,
  areaM2,
  rooms,
  compsCount,
  seismicRisk,
  eurPerM2,
  zoneMedianEurM2,
}: Props) {
  const args: string[] = [];

  if (overpricingPct != null && overpricingPct > 3) {
    args.push(
      `Pretul cerut este cu ${overpricingPct}% peste mediana zonei - exista spatiu de negociere.`,
    );
  }

  if (yearBuilt && yearBuilt < 1990) {
    const age = new Date().getFullYear() - yearBuilt;
    args.push(
      `Cladire din ${yearBuilt} (${age} ani) - poate necesita investitii in renovare sau consolidare structurala.`,
    );
  }

  if (daysOnMarket && areaDaysMedian && daysOnMarket > areaDaysMedian) {
    args.push(
      `Anuntul e activ de ${daysOnMarket} zile, peste media zonei de ${areaDaysMedian} zile - vanzatorul ar putea fi mai flexibil la pret.`,
    );
  }

  if (floor != null && (floor === 0 || floor === -1)) {
    args.push(
      "Apartament la parter/demisol - de obicei se vand cu 5-10% sub media etajelor superioare din cauza zgomotului, lipsei luminii naturale si umiditatii.",
    );
  }

  if (floor != null && floor >= 8 && hasElevator === false) {
    args.push(
      `Etaj ${floor} fara lift - accesul dificil reduce atractivitatea si pretul de piata.`,
    );
  }

  if (hasParking === false) {
    args.push(
      "Nu este mentionat loc de parcare - un dezavantaj in zonele cu trafic intens, poate justifica o reducere de 2.000-5.000 EUR.",
    );
  }

  if (seismicRisk) {
    args.push(
      "Cladire situata in zona cu risc seismic sau cu imobile RsI/RsII in proximitate - solicitati documente de consolidare.",
    );
  }

  if (yearBuilt && yearBuilt < 2000 && yearBuilt >= 1990) {
    args.push(
      "Constructie din anii '90 - verificati calitatea materialelor si starea instalatiilor (electrica, sanitara).",
    );
  }

  if (eurPerM2 && zoneMedianEurM2 && eurPerM2 > zoneMedianEurM2 * 1.1) {
    const overPct = Math.round(((eurPerM2 - zoneMedianEurM2) / zoneMedianEurM2) * 100);
    args.push(
      `Pretul pe mp (${Math.round(eurPerM2)} EUR/mp) este cu ${overPct}% peste media zonei (${Math.round(zoneMedianEurM2)} EUR/mp).`,
    );
  }

  if (overpricingPct != null && overpricingPct <= 0) {
    args.push("Pretul cerut este sub sau la nivelul medianei zonei - oferta competitiva.");
  }

  // Ensure at least 3 arguments with general negotiation tips as fallback
  const generalTips = [
    "Verificati costurile de intretinere lunara si fondul de reparatii - pot fi un argument de negociere daca sunt ridicate.",
    "Cereti ultimele facturi de utilitati (gaz, curent, apa) pentru a estima costul real al locuirii.",
    "Intrebati de cat timp este proprietatea pe piata si daca pretul a fost ajustat - vanzatorii care scad pretul sunt mai dispusi la negociere.",
    "Solicitati o vizita la diferite ore ale zilei pentru a verifica zgomotul, lumina naturala si vecinatatea.",
    "Verificati daca pretul include mobila si electrocasnicele - daca nu, negociati separat.",
  ];

  let tipIdx = 0;
  while (args.length < 3 && tipIdx < generalTips.length) {
    args.push(generalTips[tipIdx]);
    tipIdx++;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Argumente pentru negociere</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {args.map((arg, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-bold shrink-0">{i + 1}.</span>
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
