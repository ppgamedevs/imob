import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { SectionTrustFooter } from "./ReportClarityBadge";

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
      note: `Estimat ${commissionPctLow}–${commissionPctHigh}% din ${fmt(priceEur)} EUR`,
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
        <CardTitle className="text-base">Ce costuri sa iei in calcul?</CardTitle>
        <CardDescription>
          Simulare ~ estimativa la {fmt(priceEur)} EUR{hasPlusTVA ? " + TVA" : ""} — notarul stabileste
          sumele finale.
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

        {/* Educational tooltip about 0% commission */}
        {commissionStatus === "zero" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-base leading-none mt-0.5">⚠</span>
              <div>
                <div className="text-sm font-medium text-amber-900">
                  Ce inseamna &ldquo;Comision 0% cumparator&rdquo;?
                  <InfoTooltip text="In Romania, comisionul agentiei este de obicei 2-3% si poate fi platit de cumparator, vanzator sau impartit. Cand anuntul spune '0% cumparator', vanzatorul suporta integral acest cost." />
                </div>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Agentul imobiliar este platit integral de vanzator. Asta inseamna ca interesul financiar
                  al agentului este aliniat cu cel al vanzatorului - sa obtina un pret cat mai mare.
                  Ca cumparator, puteti lua in calcul angajarea propriului agent sau avocat care sa va
                  reprezinte exclusiv interesele in negociere.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unknown commission warning */}
        {commissionStatus === "unknown" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-base leading-none mt-0.5">⚠</span>
              <div>
                <div className="text-sm font-medium text-amber-900">Comision neclarificat</div>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Anuntul nu specifica daca exista comision pentru cumparator. In Romania, comisionul
                  standard este de 1–3% din pretul proprietatii. Intrebati explicit agentia inainte de
                  vizionare pentru a evita costuri neasteptate. Comisionul este negociabil.
                </p>
              </div>
            </div>
          </div>
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

        <div className="rounded-lg bg-gray-50 border p-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-gray-900">Total costuri estimative</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {hasPlusTVA ? "Include TVA" : "Fara pretul proprietatii"}
              {commissionStatus === "unknown" && " (comision neinclus)"}
            </div>
          </div>
          <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
            {fmt(totalLow)} - {fmt(totalHigh)} EUR
          </div>
        </div>

        <div className="rounded-lg bg-blue-50/50 p-3 ring-1 ring-blue-100/80 space-y-1">
          <div className="text-sm font-medium text-blue-900">Acte si notar</div>
          <p className="text-[11px] text-blue-800">
            Avocat / notar inainte de semnare — buget orientativ {fmt(costs.specialistLow)}–
            {fmt(costs.specialistHigh)} EUR.
          </p>
        </div>

        <SectionTrustFooter
          whatThisMeans="Totalul de mai sus nu include comisionul daca e neclar — nu trata suma ca factura finala."
          nextStep={
            commissionStatus === "unknown"
              ? "Confirma explicit cu agentul: procent comision, cine plateste, si daca e inclus TVA."
              : "Cere notarului un deviz de taxe inainte de avans."
          }
        />

        <p className="text-[10px] text-muted-foreground">
          Sumele sunt estimative si pot varia. Consultati un notar pentru costuri exacte.
          Curs EUR/RON utilizat: 1 EUR = {EUR_TO_RON} RON.
        </p>
      </CardContent>
    </Card>
  );
}
