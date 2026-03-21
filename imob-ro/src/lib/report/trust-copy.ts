/**
 * Human-readable trust / confidence copy for the report (not vague % alone).
 */

export function buildConfidenceNarrative(
  confidenceLevel: string | null | undefined,
  compsCount: number,
): string {
  if (compsCount < 3) {
    return "Incredere scazuta - prea putine comparabile pentru o ancora solida.";
  }
  if (confidenceLevel === "low") {
    return "Incredere scazuta - date incomplete sau dispersate in zona.";
  }
  if (confidenceLevel === "medium") {
    return "Incredere medie - estimarea e utila, dar merita verificata manual.";
  }
  if (confidenceLevel === "high") {
    return "Incredere relativ ridicata - semnale si comparabile suficient de aliniate.";
  }
  return "Incredere limitata - foloseste raportul ca reper, nu ca verdict final.";
}

export function priceWhatThisMeans(
  hasRobustEstimate: boolean,
  compsCount: number,
  confidenceLevel: string | null | undefined,
): string {
  if (!hasRobustEstimate) {
    return "Nu putem ancora pretul automat → nu folosi doar pretul listat ca reper unic.";
  }
  if (compsCount < 4 || confidenceLevel === "low") {
    return "Estimarea exista, dar e fragila → valideaza cu 2–3 anunturi reale din zona.";
  }
  return "Ai un reper de piata rezonabil → totusi confirma starea imobilului la fata locului.";
}

export function priceNextStep(compsCount: number): string {
  if (compsCount < 4) {
    return "Cauta 2–3 anunturi similare pe strazi apropiate si compara EUR/mp.";
  }
  return "Verifica la vizionare ce justifica diferenta fata de medie (finisaje, etaj, vedere).";
}

export function riskWhatThisMeans(overallLevel: "low" | "medium" | "high" | "unknown"): string {
  if (overallLevel === "high") return "Exista cel putin un risc care merita clarificat inainte de oferta.";
  if (overallLevel === "medium") return "Riscuri de context - nu sunt neaparat blocante, dar trebuie privite la fata locului.";
  if (overallLevel === "low") return "Nu am detectat riscuri majore in datele disponibile - nu inlocuieste expertiza la fata locului.";
  return "Straturi incomplete - concluziile despre risc sunt partiale.";
}

export function riskNextStep(): string {
  return "Noteaza intrebari pentru agent sau proprietar despre cele 2 riscuri de sus.";
}
