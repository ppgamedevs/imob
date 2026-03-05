/**
 * Risk identification from property characteristics.
 * Pure function - no DB or side effects.
 */

import type { PropertyProfile, Risk } from "./liquidity";

export function computeRisks(input: PropertyProfile): Risk[] {
  const risks: Risk[] = [];

  if (input.yearBuilt && input.yearBuilt < 1977)
    risks.push({
      type: "seismic",
      severity: "high",
      details: "Constructie pre-1977 - risc seismic ridicat. Verifica expertiza tehnica.",
    });
  else if (input.yearBuilt && input.yearBuilt < 1990)
    risks.push({
      type: "seismic",
      severity: "medium",
      details: "Bloc comunist - verifica starea structurala si eventuale consolidari.",
    });

  if (input.floor != null && input.totalFloors && input.floor >= input.totalFloors)
    risks.push({
      type: "structural",
      severity: "low",
      details: "Ultimul etaj - risc de infiltratii la acoperis.",
    });

  if (input.floor != null && input.floor <= 0)
    risks.push({
      type: "inundatii",
      severity: "medium",
      details: "Parter / demisol - risc umezeala, vizibilitate stradala.",
    });

  if (input.hasElevator === false && input.floor != null && input.floor >= 4)
    risks.push({
      type: "accesibilitate",
      severity: "medium",
      details: "Fara lift la etaj 4+ - accesibilitate redusa, impact asupra cererii.",
    });

  if (input.heatingType === "RADET")
    risks.push({
      type: "utilitar",
      severity: "medium",
      details: "RADET - potential intreruperi, costuri variabile.",
    });
  else if (input.heatingType === "unknown" || input.heatingType === "electric")
    risks.push({
      type: "utilitar",
      severity: "low",
      details: "Tipul de incalzire poate influenta costurile lunare.",
    });

  if (input.layoutType === "nedecomandat")
    risks.push({
      type: "lichiditate",
      severity: "medium",
      details: "Nedecomandat - timp de vanzare mai lung, audienta mai restransa.",
    });

  return risks;
}
