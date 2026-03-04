import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EUR_TO_RON = 5;

interface Props {
  priceEur: number | null;
  hasCommission?: boolean;
  commissionPctLow?: number;
  commissionPctHigh?: number;
}

function computeCosts(priceEur: number) {
  const priceRon = priceEur * EUR_TO_RON;

  // Notar: ~1-2% of price, min 250 EUR
  const notarLow = Math.max(250, Math.round(priceEur * 0.01));
  const notarHigh = Math.max(400, Math.round(priceEur * 0.02));

  // Impozit transfer: 0% for properties under 450,000 RON, 3% for the amount above
  let impozitRon = 0;
  if (priceRon > 450_000) {
    impozitRon = Math.round((priceRon - 450_000) * 0.03);
  }
  const impozitEur = Math.round(impozitRon / EUR_TO_RON);

  // Intabulare/CF: ~50-100 EUR
  const intabulareLow = 50;
  const intabulareHigh = 100;

  // Evaluator bancar (if credit): ~60-100 EUR
  const evaluatorLow = 60;
  const evaluatorHigh = 100;

  // Specialist juridic (avocat/notar consultanta)
  const specialistLow = 200;
  const specialistHigh = 500;

  return {
    notarLow,
    notarHigh,
    impozitEur,
    intabulareLow,
    intabulareHigh,
    evaluatorLow,
    evaluatorHigh,
    specialistLow,
    specialistHigh,
  };
}

export default function AcquisitionCostsSection({
  priceEur,
  hasCommission,
  commissionPctLow = 1,
  commissionPctHigh = 3,
}: Props) {
  if (!priceEur || priceEur <= 0) return null;

  const costs = computeCosts(priceEur);
  const fmt = (n: number) => n.toLocaleString("ro-RO");

  const commLow = hasCommission ? Math.round(priceEur * (commissionPctLow / 100)) : 0;
  const commHigh = hasCommission ? Math.round(priceEur * (commissionPctHigh / 100)) : 0;

  const totalLow =
    costs.notarLow +
    costs.impozitEur +
    costs.intabulareLow +
    costs.evaluatorLow +
    commLow;
  const totalHigh =
    costs.notarHigh +
    costs.impozitEur +
    costs.intabulareHigh +
    costs.evaluatorHigh +
    commHigh;

  const rows: { label: string; range: string; note?: string }[] = [
    {
      label: "Taxe notariale",
      range: `${fmt(costs.notarLow)} — ${fmt(costs.notarHigh)} EUR`,
      note: "Onorariu notar + autentificare contract",
    },
    {
      label: "Impozit transfer",
      range: costs.impozitEur > 0 ? `~${fmt(costs.impozitEur)} EUR` : "0 EUR",
      note:
        costs.impozitEur > 0
          ? "3% din suma ce depaseste 450.000 RON"
          : "Scutit (sub 450.000 RON)",
    },
    {
      label: "Intabulare (Carte Funciara)",
      range: `${fmt(costs.intabulareLow)} — ${fmt(costs.intabulareHigh)} EUR`,
    },
    {
      label: "Evaluator bancar",
      range: `${fmt(costs.evaluatorLow)} — ${fmt(costs.evaluatorHigh)} EUR`,
      note: "Necesar daca achizitionati cu credit ipotecar",
    },
  ];

  if (hasCommission) {
    rows.push({
      label: "Comision agentie",
      range: `${fmt(commLow)} — ${fmt(commHigh)} EUR`,
      note: `${commissionPctLow}-${commissionPctHigh}% din pretul de ${fmt(priceEur)} EUR`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Costuri estimative achizitie</CardTitle>
        <p className="text-xs text-muted-foreground">
          Estimare a costurilor suplimentare la pretul de {fmt(priceEur)} EUR.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start justify-between py-2.5 gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{row.label}</div>
                {row.note && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{row.note}</div>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-800 whitespace-nowrap shrink-0">
                {row.range}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-gray-50 border p-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-gray-900">Total costuri estimative</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Fara pretul proprietatii
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
            {fmt(totalLow)} — {fmt(totalHigh)} EUR
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1">
          <div className="text-sm font-medium text-blue-900">
            Verificati actele de proprietate cu un specialist
          </div>
          <p className="text-[11px] text-blue-700">
            Recomandam consultarea unui avocat sau notar inainte de semnarea contractului.
            Cost estimativ: {fmt(costs.specialistLow)} — {fmt(costs.specialistHigh)} EUR.
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Sumele sunt estimative si pot varia. Consultati un notar pentru costuri exacte.
          Curs EUR/RON utilizat: 1 EUR = {EUR_TO_RON} RON.
        </p>
      </CardContent>
    </Card>
  );
}
