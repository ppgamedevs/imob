import { createHash } from "crypto";

import sharp from "sharp";

import { logger } from "@/lib/obs/logger";

import { callStructured } from "./client";
import type { LlmVisionExtraction } from "./types";

const VISION_SYSTEM_PROMPT = `Esti un inspector imobiliar expert. Analizezi fotografiile unui apartament din Romania.

Reguli:
- Nu folosi NICIODATA em dash (—). Foloseste doar cratima normala (-).
- Evalueaza DOAR ce vezi in poze. Nu inventa.
- "condition": starea finisajelor din poze:
  * "nou" = constructie noua evident, totul nou
  * "renovat" = finisaje recente/proaspete: pereti zugraviti uniform, parchet/gresie in stare buna, baie moderna. Un apartament GOL dar cu finisaje noi este "renovat", NU "necesita_renovare"!
  * "locuibil" = stare decenta, nu e renovat recent dar e functional
  * "necesita_renovare" = probleme vizibile reale: gresie sparta, pereti deteriorati, instalatii vechi/uzate, baie degradata
  * "de_renovat" = stare proasta: igrasie, mucegai, tavan cazut, pereti exfoliati
  IMPORTANT: Nu confunda "gol/nemobilat" cu "de renovat". Daca peretii sunt curati, podeaua e in stare buna si baia e moderna, e "renovat" chiar daca nu are mobila.
- "visibleIssues": probleme vizibile REALE (igrasie, crapaturi, mucegai, instalatii vechi, pete de apa). Nu include "nemobilat" sau "gol" ca problema.
- "furnishing": "gol" (nemobilat), "partial_mobilat", "complet_mobilat".
- "brightness": 0=foarte intuneric, 1=intuneric, 2=luminos, 3=foarte luminos.
- "layoutQuality": calitatea layout-ului (deschis vs inghesuit, spatios vs mic).
- "isRender": true daca pozele sunt randari 3D / CGI / vizualizari digitale, NU fotografii reale. Indicii: iluminare perfecta si uniforma, texturi prea netede, lipsa imperfectiunilor naturale, reflexii nerealiste, mobilier identic cu cataloage 3D, plante artificiale stilizate, persoane lipsa, imagine prea "curata".
- "renderConfidence": cat de sigur esti ca sunt randari (0.0 = sigur poze reale, 1.0 = sigur randari).
- "confidence": cat de sigur esti pe evaluarea generala (0.0-1.0).
- "evidence": descriere scurta a ce ai observat in poze (1-2 propozitii). Daca sunt randari, mentioneaza explicit.`;

const VISION_SCHEMA = {
  type: "object" as const,
  properties: {
    condition: {
      type: "string" as const,
      enum: ["nou", "renovat", "locuibil", "necesita_renovare", "de_renovat"],
    },
    visibleIssues: { type: "array" as const, items: { type: "string" as const } },
    furnishing: {
      type: "string" as const,
      enum: ["gol", "partial_mobilat", "complet_mobilat"],
    },
    brightness: { type: "integer" as const, enum: [0, 1, 2, 3] },
    layoutQuality: {
      type: ["string", "null"] as const,
      enum: ["bun", "mediu", "slab", null],
    },
    isRender: { type: "boolean" as const },
    renderConfidence: { type: "number" as const },
    confidence: { type: "number" as const },
    evidence: { type: "string" as const },
  },
  required: [
    "condition", "visibleIssues", "furnishing",
    "brightness", "layoutQuality", "isRender", "renderConfidence",
    "confidence", "evidence",
  ],
  additionalProperties: false,
};

const MAX_PHOTOS = 3;
const MAX_DIMENSION = 512;

async function resizeImageToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch (err) {
    logger.warn({ err, url }, "Failed to resize image for vision");
    return null;
  }
}

export function hashImageUrls(urls: string[]): string {
  const h = createHash("sha256");
  for (const u of [...urls].sort()) h.update(u);
  return h.digest("hex");
}

export async function extractVisionWithLlm(
  photoUrls: string[],
): Promise<LlmVisionExtraction | null> {
  const urls = photoUrls
    .filter((u) => u.startsWith("http"))
    .slice(0, MAX_PHOTOS);

  if (!urls.length) return null;

  const images: { type: "image_url"; image_url: { url: string; detail: "low" } }[] = [];
  for (const url of urls) {
    const b64 = await resizeImageToBase64(url);
    if (b64) {
      images.push({ type: "image_url", image_url: { url: b64, detail: "low" } });
    }
  }

  if (!images.length) {
    logger.warn("No images could be processed for vision LLM");
    return null;
  }

  const result = await callStructured<LlmVisionExtraction>({
    systemPrompt: VISION_SYSTEM_PROMPT,
    userContent: [
      { type: "text", text: "Analizeaza aceste fotografii ale unui apartament:" },
      ...images,
    ],
    jsonSchema: VISION_SCHEMA,
    schemaName: "listing_vision_extraction",
    maxTokens: 800,
  });

  return result?.data ?? null;
}

/**
 * Analyze user-uploaded photos (base64 data URLs) without fetching from external URLs.
 * Resizes server-side with sharp before sending to the vision model.
 */
export async function analyzeUserPhotos(
  dataUrls: string[],
): Promise<LlmVisionExtraction | null> {
  const valid = dataUrls
    .filter((u) => u.startsWith("data:image/"))
    .slice(0, MAX_PHOTOS);

  if (!valid.length) return null;

  const images: { type: "image_url"; image_url: { url: string; detail: "low" } }[] = [];
  for (const dataUrl of valid) {
    try {
      const base64Part = dataUrl.split(",")[1];
      if (!base64Part) continue;
      const buffer = Buffer.from(base64Part, "base64");
      const resized = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      const b64 = `data:image/jpeg;base64,${resized.toString("base64")}`;
      images.push({ type: "image_url", image_url: { url: b64, detail: "low" } });
    } catch (err) {
      logger.warn({ err }, "Failed to process user-uploaded photo for vision");
    }
  }

  if (!images.length) return null;

  const result = await callStructured<LlmVisionExtraction>({
    systemPrompt: VISION_SYSTEM_PROMPT,
    userContent: [
      { type: "text", text: "Analizeaza aceste fotografii ale unui apartament:" },
      ...images,
    ],
    jsonSchema: VISION_SCHEMA,
    schemaName: "estimate_user_vision",
    maxTokens: 800,
  });

  return result?.data ?? null;
}
