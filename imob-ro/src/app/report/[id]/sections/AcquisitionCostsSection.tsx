import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EUR_TO_RON = 5;

type CommissionStatus = "zero" | "standard" | "unknown";

interface Props {
  priceEur: number | null;
  commissionStatus: CommissionStatus;
  commissionPctLow?: number;
  commissionPctHigh?: number;
  hasPlusTVA?: boolean;
  vatRate?: number | null;
  vatAmount?: number | null;
  priceWithVAT?: number | null;
  reducedVATEligible?: boolean;
  reducedVATReason?: string;
}

function computeCosts(priceEur: number) {
  const priceRon = priceEur * EUR_TO_RON;

  const notarLow = Math.max(250, Math.round(priceEur * 0.01));
  const notarHigh = Math.max(400, Math.round(priceEur * 0.02));

  let impozitRon = 0;
  if (priceRon > 450_000) {
    impozitRon = Math.round((priceRon - 450_000) * 0.03);
  }
  const impozitEur = Math.round(impozitRon / EUR_TO_RON);

  const intabulareLow = 50;
  const intabulareHigh = 100;

  const evaluatorLow = 60;
  const evaluatorHigh = 100;

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

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex ml-1 cursor-help">
      <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold leading-none">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-900 text-white text-[11px] leading-relaxed p-3 shadow-lg opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity z-50">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

export default function AcquisitionCostsSection({
  priceEur,
  commissionStatus,
  commissionPctLow = 1,
  commissionPctHigh = 3,
  hasPlusTVA,
  vatRate,
  vatAmount,
  priceWithVAT,
  reducedVATEligible,
  reducedVATReason,
}: Props) {
  if (!priceEur || priceEur <= 0) return null;

  const costs = computeCosts(priceEur);
  const fmt = (n: number) => n.toLocaleString("ro-RO");

  const commLow = Math.round(priceEur * (commissionPctLow / 100));
  const commHigh = Math.round(priceEur * (commissionPctHigh / 100));

  const vatEur = hasPlusTVA && vatAmount ? vatAmount : 0;

  const totalLow =
    costs.notarLow +
    costs.impozitEur +
    costs.intabulareLow +
    costs.evaluatorLow +
    vatEur +
    (commissionStatus === "standard" ? commLow : 0);
  const totalHigh =
    costs.notarHigh +
    costs.impozitEur +
    costs.intabulareHigh +
    costs.evaluatorHigh +
    vatEur +
    (commissionStatus === "standard" ? commHigh : 0);

  const rows: { label: string; range: string; note?: string; highlight?: "info" | "warning" }[] = [];

  if (hasPlusTVA && vatAmount && vatRate) {
    rows.push({
      label: `TVA ${vatRate}%`,
      range: `${fmt(vatAmount)} EUR`,
      note: `Pretul afisat (${fmt(priceEur)} EUR) nu include TVA. Total cu TVA: ${fmt(priceWithVAT ?? priceEur + vatAmount)} EUR`,
      highlight: "warning",
    });
  }

  rows.push(
    {
      label: "Taxe notariale",
      range: `${fmt(costs.notarLow)} - ${fmt(costs.notarHigh)} EUR`,
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
      range: `${fmt(costs.intabulareLow)} - ${fmt(costs.intabulareHigh)} EUR`,
    },
    {
      label: "Evaluator bancar",
      range: `${fmt(costs.evaluatorLow)} - ${fmt(costs.evaluatorHigh)} EUR`,
      note: "Necesar daca achizitionati cu credit ipotecar",
    },
  );

  if (commissionStatus === "zero") {
    rows.push({
      label: "Comision agentie cumparator",
      range: "0 EUR (din anunt)",
      note: "Vanzatorul plateste comisionul. Vedeti explicatia de mai jos.",
    });
  } else if (commissionStatus === "standard") {
    rows.push({
      label: "Comision agentie cumparator",
      range: `${fmt(commLow)} - ${fmt(commHigh)} EUR`,
      note: `Estimat ${commissionPctLow}-${commissionPctHigh}% din ${fmt(priceEur)} EUR`,
    });
  } else {
    rows.push({
      label: "Comision agentie cumparator",
      range: `Neclar`,
      note: "Nu am gasit informatii despre comision in anunt. Intrebati agentia inainte de vizionare.",
      highlight: "warning",
    });
  }

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Costuri achiziție</CardTitle>
        <CardDescription>
          Simulare la {fmt(priceEur)} EUR{hasPlusTVA ? " + TVA" : ""} — sumele finale le stabilește notarul.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`flex items-start justify-between py-2.5 gap-3 ${
                row.highlight === "warning" ? "bg-amber-50/60 -mx-2 px-2 rounded" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{row.label}</div>
                {row.note && (
                  <div className={`text-[11px] mt-0.5 ${
                    row.highlight === "warning" ? "text-amber-700 font-medium" : "text-muted-foreground"
                  }`}>
                    {row.highlight === "warning" && <span className="mr-1">⚠</span>}
                    {row.note}
                  </div>
                )}
              </div>
              <div className={`text-sm font-semibold whitespace-nowrap shrink-0 ${
                row.highlight === "warning" ? "text-amber-700" : "text-gray-800"
              }`}>
                {row.range}
              </div>
            </div>
          ))}
        </div>

        {commissionStatus === "zero" && (
          <p className="text-xs font-medium text-amber-900 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2">
            Comision 0% cumpărător = plătește vânzătorul — aliniere interese cu vânzătorul.
            <InfoTooltip text="În România comisionul agenției e de obicei 1–3%; „0% cumpărător” înseamnă că vânzătorul acoperă comisionul agenției." />
          </p>
        )}

        {commissionStatus === "unknown" && (
          <p className="text-xs font-medium text-amber-900 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2">
            Comision cumpărător neclar în anunț — confirmă cu agenția înainte de vizionare.
          </p>
        )}

        {/* Reduced VAT eligibility */}
        {hasPlusTVA && reducedVATEligible != null && (
          <div className={`rounded-lg border p-3 space-y-1.5 ${
            reducedVATEligible
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-gray-200 bg-gray-50/70"
          }`}>
            <div className="flex items-start gap-2">
              <span className={`text-base leading-none mt-0.5 ${
                reducedVATEligible ? "text-emerald-600" : "text-gray-500"
              }`}>
                {reducedVATEligible ? "💡" : "ℹ"}
              </span>
              <div>
                <div className={`text-sm font-medium ${
                  reducedVATEligible ? "text-emerald-900" : "text-gray-700"
                }`}>
                  TVA redus 5%
                  <InfoTooltip text="In Romania, TVA-ul redus de 5% se aplica pentru prima locuinta achizitionata de o persoana fizica, daca pretul fara TVA nu depaseste 120.000 EUR si suprafata utila nu depaseste 120 mp." />
                </div>
                <p className={`text-[11px] mt-1 leading-relaxed ${
                  reducedVATEligible ? "text-emerald-800" : "text-gray-600"
                }`}>
                  {reducedVATReason}
                  {reducedVATEligible && ` In loc de ${fmt(vatAmount ?? 0)} EUR (TVA ${vatRate}%), ati putea plati ~${fmt(Math.round(priceEur * 0.05))} EUR (TVA 5%).`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-slate-900 text-white border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Total costuri estimate
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {hasPlusTVA ? "Include TVA listat" : "Exclude prețul proprietății"}
              {commissionStatus === "unknown" ? " · comision neinclus" : ""}
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">
            {fmt(totalLow)} – {fmt(totalHigh)} EUR
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Avocat / notar: ~{fmt(costs.specialistLow)}–{fmt(costs.specialistHigh)} EUR. Curs 1 EUR ={" "}
          {EUR_TO_RON} RON.
        </p>
      </CardContent>
    </Card>
  );
}
