import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const CHECK = "✓";
const WARN = "!";

function pushUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

export default function DataInsightsSection(props: Props) {
  const certain: string[] = [];
  const unclear: string[] = [];
  const moneyRisks: string[] = [];
  const comparableCount = props.estimateComparableCount ?? props.compsCount;

  if (props.hasPrice) {
    certain.push("Pretul cerut este vizibil in analiza.");
  } else {
    unclear.push("Pretul nu este disponibil in analiza.");
    moneyRisks.push(
      "Fara un pret clar, nu poti ancora corect negocierea sau costul total al achizitiei.",
    );
  }

  if (props.hasPriceEstimate) {
    certain.push("Exista un reper de pret din analiza pietei.");
  } else {
    unclear.push("Nu am putut construi o estimare de pret suficient de robusta.");
    moneyRisks.push(
      "Fara o estimare robusta, oferta trebuie facuta mai conservator si confirmata din comparabile reale.",
    );
  }

  if (props.hasArea) {
    certain.push("Suprafata utila este disponibila, deci pretul/mp poate fi verificat.");
  } else {
    unclear.push("Suprafata utila nu este disponibila in analiza.");
    moneyRisks.push(
      "Fara suprafata utila, poti compara gresit oferta si poti subestima costul real pe mp.",
    );
  }

  if (props.hasRooms) {
    certain.push("Numarul de camere este clar in analiza.");
  } else {
    unclear.push("Numarul de camere nu este disponibil in analiza.");
  }

  if (props.isHouse) {
    // Houses/villas don't need floor information
  } else if (props.hasFloor) {
    certain.push("Etajul este disponibil si poate fi verificat.");
  } else {
    unclear.push("Etajul nu este disponibil in analiza.");
    pushUnique(
      moneyRisks,
      "Etajul influenteaza lichiditatea, lumina, zgomotul si uneori finantarea, deci merita confirmat inainte de oferta.",
    );
  }

  if (props.hasYear) {
    certain.push("Anul constructiei este prezent in analiza.");
  } else {
    unclear.push("Anul constructiei nu este disponibil in analiza.");
    moneyRisks.push(
      "Fara anul constructiei, poti subestima costurile de renovare, riscul structural sau limitarile la creditare.",
    );
  }

  if (props.hasAddress) {
    certain.push("Adresa exacta este disponibila in analiza.");
  } else {
    unclear.push(
      props.approximateLocationLabel
        ? `Adresa exacta nu este disponibila, dar anuntul indica macar zona aproximativa: ${props.approximateLocationLabel}.`
        : "Adresa exacta nu este disponibila.",
    );
  }

  if (props.hasCoords) {
    certain.push("Proprietatea a fost localizata pe harta, deci analiza de zona are baza geografica.");
  } else {
    unclear.push(
      props.approximateLocationLabel
        ? `Nu am putut localiza exact proprietatea pe harta, dar avem un reper de zona: ${props.approximateLocationLabel}.`
        : "Nu am putut localiza precis proprietatea pe harta.",
    );
  }

  if (props.hasPhotos) {
    certain.push("Exista fotografii in anunt pentru o verificare vizuala initiala.");
  } else {
    unclear.push("Nu exista fotografii in anunt.");
    moneyRisks.push(
      "Fara fotografii, starea reala poate ascunde renovari, igrasie sau finisaje slabe care iti cresc bugetul dupa cumparare.",
    );
  }

  if (props.hasAddress && props.hasCoords) {
    certain.push("Micro-locatia poate fi verificata mai usor fata de un anunt doar cu zona generica.");
  } else {
    pushUnique(
      moneyRisks,
      props.approximateLocationLabel
        ? `Avem doar un reper larg de zona (${props.approximateLocationLabel}), nu micro-locatia exacta, deci strada, traficul si vecinatatile reale pot schimba valoarea perceputa.`
        : "Fara adresa exacta si localizare precisa, poti plati pentru o zona mai buna pe hartie decat in realitate.",
    );
  }

  if (comparableCount >= 4) {
    certain.push(`Estimarea este sustinuta de ${comparableCount} comparabile relevante.`);
  } else if (props.hasPriceEstimate && comparableCount > 0) {
    unclear.push(
      `Estimarea exista, dar este sustinuta doar de ${comparableCount} comparabile relevante.`,
    );
    moneyRisks.push(
      "Cand estimarea are putine comparabile, nu ancora negocierea doar in acel numar fara o verificare manuala.",
    );
  } else if (props.hasPriceEstimate && comparableCount === 0) {
    unclear.push(
      "Estimarea exista, dar se bazeaza mai mult pe statistica de zona decat pe comparabile apropiate.",
    );
    moneyRisks.push(
      "O estimare bazata mai mult pe statistica de zona poate rata diferente importante de bloc, strada sau finisaje.",
    );
  }

  if (props.confidenceLevel === "low" && props.hasPriceEstimate) {
    unclear.push("Nivelul de incredere al estimarii este scazut, deci datele disponibile sunt limitate.");
    pushUnique(
      moneyRisks,
      "Daca increderea estimarii este scazuta, oferta trebuie validata suplimentar cu comparabile si acte, nu doar cu raportul automat.",
    );
  }

  const sl = props.seismicLevel;
  if (sl === "RS1" || sl === "RsI") {
    moneyRisks.push(
      "Cladirea este in clasa de risc seismic RsI (bulina rosie) - poate afecta finantarea, asigurarea si revanzarea.",
    );
  } else if (sl === "RS2" || sl === "RsII") {
    moneyRisks.push(
      "Cladirea este in clasa de risc seismic RsII - starea structurala trebuie verificata inainte de orice pas financiar ferm.",
    );
  } else if (sl === "RS3" || sl === "RsIII") {
    moneyRisks.push(
      "Cladirea are degradari structurale identificate (RsIII) - pot aparea costuri suplimentare de mentenanta sau limitari la revanzare.",
    );
  }

  const completeness = Math.round((certain.length / (certain.length + unclear.length)) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Radiografia anuntului</CardTitle>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              completeness >= 80
                ? "bg-green-100 text-green-800"
                : completeness >= 50
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            Claritate date {completeness}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Aici nu punctam cat de bine suna anuntul, ci cat de mult poti verifica
          inainte sa pui bani pe masa.
        </p>

        {certain.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="text-sm font-semibold text-emerald-900 mb-2">Ce e sigur</div>
            <ul className="space-y-1.5">
              {certain.map((item) => (
                <li key={item} className="text-sm text-emerald-900 flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">{CHECK}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unclear.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="text-sm font-semibold text-amber-900 mb-2">Ce e neclar</div>
            <ul className="space-y-1.5">
              {unclear.map((item) => (
                <li key={item} className="text-sm text-amber-900 flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">{WARN}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {moneyRisks.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3">
            <div className="text-sm font-semibold text-rose-900 mb-2">
              Ce te poate costa bani daca nu verifici
            </div>
            <ul className="space-y-1.5">
              {moneyRisks.map((item) => (
                <li key={item} className="text-sm text-rose-900 flex items-start gap-2">
                  <span className="text-rose-600 mt-0.5">&#9432;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
