import { prisma } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";

import { extractWithProfile } from "./engine";
import { defaultProfile, imobiliareRo, olxRo, storiaRo } from "./profiles.seed";

function domainOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const builtins: Record<string, any> = {
  "imobiliare.ro": imobiliareRo,
  "storia.ro": storiaRo,
  "olx.ro": olxRo,
};

export async function runExtractor(html: string, url: string) {
  const domain = domainOf(url);
  // 1) DB profile first
  const dbp = await prisma.extractorProfile.findUnique({ where: { domain } }).catch(() => null);

  const rules =
    dbp?.active && dbp?.rules
      ? (dbp.rules as any)
      : builtins[domain]
        ? builtins[domain]
        : defaultProfile;

  const result = extractWithProfile(html, rules);
  // log
  await prisma.extractLog
    .create({
      data: {
        url: normalizeUrl(url) ?? url,
        domain,
        profileId: dbp?.id ?? null,
        ok: true,

        fields: {
          title: result.title,
          price: result.price,
          currency: result.currency,
          areaM2: result.areaM2,
          rooms: result.rooms,
          floorRaw: result.floorRaw,
          yearBuilt: result.yearBuilt,
          addressRaw: result.addressRaw,
          photos: (result.photos || []).length,
        } as any,
      },
    })
    .catch(() => {});
  return result;
}
