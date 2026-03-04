import { logger } from "@/lib/obs/logger";

import { callStructured } from "./client";
import type { LlmTextExtraction } from "./types";

const SYSTEM_PROMPT = `Esti un analist imobiliar expert pe piata din Romania.
Primesti titlul si descrierea unui anunt imobiliar. Extrage informatiile structurate din text.

Reguli stricte:
- Raspunde DOAR pe baza textului dat. Nu inventa informatii.
- Daca nu gasesti o informatie, pune campul pe null.
- Daca nu esti sigur, pune confidence sub 0.5 si lasa campul null.
- Pentru fiecare camp non-null, adauga un citat exact din text in "evidence".
- "redFlags" = semne de alarma pentru cumparator. Format: "Problema: explicatie scurta de ce e un risc". Exemple: "Comision standard agentie: cumparatorul va plati un comision suplimentar de 1-3% din pret", "Fara CF mentionat: lipseste certitudinea juridica a proprietatii", "Pret negociabil: poate indica probleme cu proprietatea sau urgenta vanzarii". NU pune "comision 0%" ca red flag - acesta e un lucru pozitiv.
- "hasParking": true daca se mentioneaza loc de parcare, garaj, parcare subterana/exterioara. false daca se spune explicit "fara parcare". null daca nu se mentioneaza.
- "positives" = puncte forte (renovat, aproape metrou, zona linistita, centrala proprie, loc de parcare).
- "summary" = 2 propozitii in romana care rezuma anuntul obiectiv.
- "sellerMotivation": "urgent" daca apar cuvinte ca "urgent", "pret negociabil", "accept orice oferta".
- "balconyM2" si "usableAreaM2" doar daca sunt explicit mentionate in text.
- "heatingType": "centrala_proprie", "RADET", "AC", "pardoseala" sau null.
- "buildingType": "bloc_vechi", "bloc_nou", "vila", "casa" sau null.
- "condition": "nou" (constructie noua), "renovat" (renovat recent), "locuibil" (stare buna fara renovare), "necesita_renovare" (are nevoie de lucrari), "de_renovat" (stare proasta).`;

const TEXT_SCHEMA = {
  type: "object" as const,
  properties: {
    condition: {
      type: ["string", "null"] as const,
      enum: ["nou", "renovat", "locuibil", "necesita_renovare", "de_renovat", null],
    },
    conditionDetails: { type: ["string", "null"] as const },
    renovationYear: { type: ["integer", "null"] as const },
    hasParking: { type: ["boolean", "null"] as const },
    hasStorage: { type: ["boolean", "null"] as const },
    hasElevator: { type: ["boolean", "null"] as const },
    heatingType: { type: ["string", "null"] as const },
    buildingType: { type: ["string", "null"] as const },
    orientation: { type: ["string", "null"] as const },
    balconyM2: { type: ["number", "null"] as const },
    usableAreaM2: { type: ["number", "null"] as const },
    redFlags: { type: "array" as const, items: { type: "string" as const } },
    positives: { type: "array" as const, items: { type: "string" as const } },
    sellerMotivation: {
      type: ["string", "null"] as const,
      enum: ["normal", "urgent", "foarte_urgent", null],
    },
    summary: { type: "string" as const },
    fieldConfidence: {
      type: "object" as const,
      properties: {
        condition: { type: "number" as const },
        renovationYear: { type: "number" as const },
        balconyM2: { type: "number" as const },
        heatingType: { type: "number" as const },
        usableAreaM2: { type: "number" as const },
        sellerMotivation: { type: "number" as const },
      },
      required: ["condition", "renovationYear", "balconyM2", "heatingType", "usableAreaM2", "sellerMotivation"],
      additionalProperties: false,
    },
    evidence: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          field: { type: "string" as const },
          quote: { type: "string" as const },
        },
        required: ["field", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "condition", "conditionDetails", "renovationYear",
    "hasParking", "hasStorage", "hasElevator",
    "heatingType", "buildingType", "orientation",
    "balconyM2", "usableAreaM2",
    "redFlags", "positives", "sellerMotivation", "summary",
    "fieldConfidence", "evidence",
  ],
  additionalProperties: false,
};

const MAX_TEXT_LENGTH = 2000;

export async function extractTextWithLlm(
  title: string,
  description: string,
): Promise<LlmTextExtraction | null> {
  const text = [
    title ? `Titlu: ${title}` : "",
    description ? `Descriere: ${description.slice(0, MAX_TEXT_LENGTH)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!text || text.length < 20) {
    logger.debug("Text too short for LLM extraction, skipping");
    return null;
  }

  const result = await callStructured<LlmTextExtraction>({
    systemPrompt: SYSTEM_PROMPT,
    userContent: text,
    jsonSchema: TEXT_SCHEMA,
    schemaName: "listing_text_extraction",
    maxTokens: 1500,
  });

  return result?.data ?? null;
}
