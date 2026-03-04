/**
 * Price adjustment rules based on property characteristics.
 * Pure function — no DB or side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Adjustment {
  name: string;
  deltaPct: number;
  reason: string;
}

export interface AdjustmentInput {
  condition?: string | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  hasElevator?: boolean | null;
  hasParking?: boolean | null;
  heatingType?: string | null;
  layoutType?: string | null;
  isThermoRehab?: boolean | null;
  balconyM2?: number | null;
}

// ---------------------------------------------------------------------------
// Adjustment engine
// ---------------------------------------------------------------------------

export function computeAdjustments(input: AdjustmentInput): Adjustment[] {
  const adj: Adjustment[] = [];

  // Condition
  const condDelta: Record<string, { d: number; r: string }> = {
    nou: { d: 6, r: "Finisaje noi / bloc nou — prima maxima" },
    renovat: { d: 3, r: "Apartament renovat recent" },
    locuibil: { d: 0, r: "Stare standard, fara ajustare" },
    necesita_renovare: { d: -6, r: "Necesita renovare — discount asteptat" },
    de_renovat: { d: -10, r: "De renovat complet — discount semnificativ" },
  };
  if (input.condition) {
    const cd = condDelta[input.condition];
    if (cd && cd.d !== 0) adj.push({ name: "Stare apartament", deltaPct: cd.d, reason: cd.r });
  }

  // Floor
  if (input.floor != null) {
    if (input.floor <= 0)
      adj.push({
        name: "Parter / demisol",
        deltaPct: -6,
        reason: "Parterul are cerere mai scazuta",
      });
    else if (input.floor === 1)
      adj.push({ name: "Etaj 1", deltaPct: -2, reason: "Etajul 1 — zgomot stradal, vizibilitate" });
    else if (input.totalFloors && input.floor >= input.totalFloors)
      adj.push({
        name: "Ultimul etaj",
        deltaPct: -3,
        reason: "Ultimul etaj — risc infiltratii, caldura",
      });
    else if (input.floor >= 2 && input.floor <= 5)
      adj.push({
        name: "Etaj intermediar",
        deltaPct: 2,
        reason: "Etajele 2-5 sunt cele mai cautate",
      });
    else if (input.floor >= 8)
      adj.push({
        name: "Etaj inalt",
        deltaPct: 3,
        reason: "Etajele inalte — panorama, mai putina poluare",
      });
  }

  // Year bucket
  if (input.yearBuilt) {
    if (input.yearBuilt < 1977)
      adj.push({
        name: "Constructie pre-1977",
        deltaPct: -5,
        reason: "Risc seismic mai mare, fundatie veche",
      });
    else if (input.yearBuilt >= 1978 && input.yearBuilt <= 1990)
      adj.push({
        name: "Constructie 1978-1990",
        deltaPct: -2,
        reason: "Bloc comunist tipic — uzura medie",
      });
    else if (input.yearBuilt >= 2006)
      adj.push({
        name: "Constructie dupa 2006",
        deltaPct: 4,
        reason: "Bloc nou — izolatie, eficienta energetica",
      });
  }

  // Elevator
  if (input.hasElevator === true && input.floor && input.floor >= 3)
    adj.push({
      name: "Lift disponibil",
      deltaPct: 2,
      reason: "Liftul adauga confort la etaje inalte",
    });
  else if (input.hasElevator === false && input.floor && input.floor >= 4)
    adj.push({
      name: "Fara lift",
      deltaPct: -4,
      reason: "Lipsa liftului scade atractivitatea la etaje inalte",
    });

  // Parking
  if (input.hasParking === true)
    adj.push({ name: "Loc de parcare", deltaPct: 3, reason: "Parcarea inclusa adauga valoare" });

  // Heating
  if (input.heatingType === "centrala")
    adj.push({
      name: "Centrala proprie",
      deltaPct: 1,
      reason: "Independenta termica — costuri mai mici",
    });
  else if (input.heatingType === "RADET")
    adj.push({
      name: "Incalzire RADET",
      deltaPct: 0,
      reason: "RADET — standard pentru Bucuresti",
    });
  else if (input.heatingType === "pompa_caldura")
    adj.push({ name: "Pompa de caldura", deltaPct: 4, reason: "Eficienta energetica superioara" });
  else if (input.heatingType === "electric")
    adj.push({
      name: "Incalzire electrica",
      deltaPct: -1,
      reason: "Costuri mai mari de incalzire electrica",
    });

  // Layout
  if (input.layoutType === "decomandat")
    adj.push({
      name: "Decomandat",
      deltaPct: 2,
      reason: "Compartimentare preferata — camere independente",
    });
  else if (input.layoutType === "nedecomandat")
    adj.push({
      name: "Nedecomandat",
      deltaPct: -4,
      reason: "Camerele nedecomand. sunt mai greu de valorificat",
    });
  else if (input.layoutType === "semidecomandat")
    adj.push({
      name: "Semidecomandat",
      deltaPct: -1,
      reason: "Compartimentare partial dependenta",
    });

  // Thermo rehab
  if (input.isThermoRehab === true)
    adj.push({
      name: "Reabilitat termic",
      deltaPct: 1.5,
      reason: "Costuri de intretinere reduse, confort termic",
    });

  // Balcony
  if (input.balconyM2 && input.balconyM2 >= 5)
    adj.push({
      name: "Balcon generos",
      deltaPct: 2,
      reason: `Balcon de ${input.balconyM2} mp — spatiu suplimentar`,
    });

  return adj;
}

/** Sum of all adjustment percentages. */
export function totalAdjustmentPct(adjustments: Adjustment[]): number {
  return adjustments.reduce((sum, a) => sum + a.deltaPct, 0);
}
