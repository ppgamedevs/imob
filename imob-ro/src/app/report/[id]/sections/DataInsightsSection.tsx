import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { SectionTrustFooter } from "./ReportClarityBadge";

interface Props {
  hasPrice: boolean;
  hasPriceEstimate: boolean;
  hasArea: boolean;
  hasRooms: boolean;
  hasFloor: boolean;
  hasYear: boolean;
  hasAddress: boolean;
  hasCoords: boolean;
  hasPhotos: boolean;
  compsCount: number;
  estimateComparableCount?: number;
  confidenceLevel?: string | null;
  seismicLevel?: string | null;
  isHouse?: boolean;
  approximateLocationLabel?: string | null;
}

const MAX_EACH = 6;

function pushUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

function truncateLine(raw: string, max = 95): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 50 ? cut.slice(0, sp) : cut).trim() + "…";
}

export default function DataInsightsSection(props: Props) {
  const certain: string[] = [];
  const unclear: string[] = [];
  const moneyHints: string[] = [];
  const comparableCount = props.estimateComparableCount ?? props.compsCount;

  if (props.hasPrice) {
    certain.push("Pret cerut extras din anunt.");
  } else {
    unclear.push("Pret lipsa din datele analizate.");
    moneyHints.push("Fara pret nu poti calcula bugetul real.");
  }

  if (props.hasPriceEstimate) {
    certain.push("Exista reper de pret din model (~ estimat).");
  } else {
    unclear.push("Fara interval estimat automat.");
    moneyHints.push("Negociaza conservator pana ai comparabile.");
  }

  if (props.hasArea) {
    certain.push("Suprafata disponibila pentru EUR/mp.");
  } else {
    unclear.push("Suprafata neclara in analiza.");
    moneyHints.push("Confirma mp util la vizionare.");
  }

  if (props.hasRooms) {
    certain.push("Numar camere in date.");
  } else {
    unclear.push("Camere neclare.");
  }

  if (!props.isHouse) {
    if (props.hasFloor) {
      certain.push("Etaj in date.");
    } else {
      unclear.push("Etaj lipsa.");
      pushUnique(moneyHints, "Etajul influenteaza confortul si lichiditatea.");
    }
  }

  if (props.hasYear) {
    certain.push("An constructie in date.");
  } else {
    unclear.push("An constructie lipsa.");
    pushUnique(moneyHints, "Anul afecteaza risc si cost renovare.");
  }

  if (props.hasAddress) {
    certain.push("Adresa (text) din anunt.");
  } else {
    unclear.push(
      props.approximateLocationLabel
        ? `Zona aproximativa: ${props.approximateLocationLabel}.`
        : "Adresa exacta lipsa.",
    );
  }

  if (props.hasCoords) {
    certain.push("Localizare pe harta pentru zona (~).");
  } else {
    unclear.push("Fara coordonate precise.");
  }

  if (props.hasPhotos) {
    certain.push("Fotografii in anunt.");
  } else {
    unclear.push("Fara fotografii.");
    pushUnique(moneyHints, "Starea reala poate diferi mult.");
  }

  if (comparableCount >= 4) {
    certain.push(`${comparableCount} comparabile folosite in model.`);
  } else if (props.hasPriceEstimate && comparableCount > 0) {
    unclear.push(`Doar ${comparableCount} comparabile apropiate — estimare fragila.`);
    pushUnique(moneyHints, "Valideaza pretul manual in zona.");
  } else if (props.hasPriceEstimate) {
    unclear.push("Estimare bazata mai mult pe statistica de zona.");
    pushUnique(moneyHints, "Cauta 3–4 anunturi echivalente pe strazi apropiate.");
  }

  if (props.confidenceLevel === "low" && props.hasPriceEstimate) {
    unclear.push("Incredere scazuta la estimare.");
  }

  const sl = props.seismicLevel;
  if (sl === "RS1" || sl === "RsI") {
    pushUnique(moneyHints, "Clasa RsI — verifica finantare si expertiza.");
  } else if (sl === "RS2" || sl === "RsII") {
    pushUnique(moneyHints, "Clasa RsII — confirma structura inainte de oferta.");
  } else if (sl === "RS3" || sl === "RsIII") {
    pushUnique(moneyHints, "RsIII — posibile costuri suplimentare.");
  }

  const completeness = Math.round((certain.length / Math.max(1, certain.length + unclear.length)) * 100);

  const certainShow = certain.slice(0, MAX_EACH).map(truncateLine);
  const unclearShow = unclear.slice(0, MAX_EACH).map(truncateLine);
  const topMoney = moneyHints[0]
    ? truncateLine(moneyHints[0], 120)
    : "Nu am detectat o „capcana” unica, dar verifica tot ce e neclar mai sus.";

  const whatMeans =
    completeness >= 70
      ? "Majoritatea reperelor esentiale sunt prezente — totusi confirma la fata locului ce e ~ estimat."
      : completeness >= 45
        ? "Lista de neclaritati e lunga: nu te baza doar pe raport pentru oferta fermă."
        : "Date incomplete — trateaza raportul ca ghid, nu ca verdict final.";

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Ce stim sigur si ce nu din acest anunt</CardTitle>
            <CardDescription className="mt-1">
              ✔ = reiese clar din datele extrase. ? = gol sau neclar — merita verificat.
            </CardDescription>
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              completeness >= 70
                ? "bg-emerald-100 text-emerald-900"
                : completeness >= 45
                  ? "bg-amber-100 text-amber-950"
                  : "bg-rose-100 text-rose-900"
            }`}
          >
            Claritate {completeness}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {certainShow.length > 0 && (
          <div className="rounded-lg bg-emerald-50/50 px-3 py-3 ring-1 ring-emerald-100/80">
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-900 mb-2">
              A. Ce este sigur
            </div>
            <ul className="space-y-1.5">
              {certainShow.map((item) => (
                <li key={item} className="text-[13px] leading-snug text-emerald-950 flex gap-2">
                  <span className="text-emerald-600 shrink-0">✔</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unclearShow.length > 0 && (
          <div className="rounded-lg bg-amber-50/50 px-3 py-3 ring-1 ring-amber-100/80">
            <div className="text-[11px] font-bold uppercase tracking-wide text-amber-950 mb-2">
              B. Ce nu este clar
            </div>
            <ul className="space-y-1.5">
              {unclearShow.map((item) => (
                <li key={item} className="text-[13px] leading-snug text-amber-950 flex gap-2">
                  <span className="text-amber-700 shrink-0">?</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <SectionTrustFooter
          whatThisMeans={`${whatMeans} ${topMoney}`}
          nextStep="La vizionare: confirma punctele din lista B si noteaza raspunsurile in scris daca e posibil."
        />
      </CardContent>
    </Card>
  );
}
