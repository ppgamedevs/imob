import * as cheerio from "cheerio";

import {
  detectCurrency,
  normalizeAddress,
  normalizeFloor,
  parseArea,
  parseMoneyRo,
  parseRooms,
  parseYear,
  preferLg,
  stripTags,
} from "./normalize";
import { Extracted, ExtractProfileRules } from "./types";

type TransformKey = NonNullable<ExtractProfileRules["transform"]>[keyof NonNullable<
  ExtractProfileRules["transform"]
>];

function applyCleanse(val: string, pairs?: Array<[string, string]>) {
  if (!val || !pairs?.length) return val;
  let r = val;
  for (const [a, b] of pairs) r = r.replace(new RegExp(a, "g"), b);
  return r;
}

function pickFirst($: cheerio.CheerioAPI, sel?: string | string[], attr?: string) {
  if (!sel) return null;
  const s = Array.isArray(sel) ? sel : [sel];
  for (const one of s) {
    const el = $(one).first();
    if (el.length) {
      const v = attr ? el.attr(attr) : el.text();
      if (v && String(v).trim()) return String(v).trim();
    }
  }
  return null;
}

function runTransform(key: TransformKey, v: string) {
  switch (key) {
    case "parseMoneyRo":
      return parseMoneyRo(v);
    case "parseArea":
      return parseArea(v);
    case "parseRooms":
      return parseRooms(v);
    case "normalizeFloor":
      return normalizeFloor(v);
    case "parseYear":
      return parseYear(v);
    case "detectCurrency":
      return detectCurrency(v);
    case "normalizeAddress":
      return normalizeAddress(v);
    case "preferLg":
      return preferLg(v);
    default:
      return v;
  }
}

export function extractWithProfile(html: string, rules: ExtractProfileRules): Extracted {
  const $ = cheerio.load(html);

  const rawTitle = pickFirst($, rules.selectors?.title, rules.attrs?.title) ?? "";
  const title = stripTags(rawTitle);

  // price + currency
  let priceVal: number | null = null;
  let currency: "EUR" | "RON" | "USD" | null = null;
  const priceRaw = pickFirst($, rules.selectors?.price, rules.attrs?.price);
  const curRaw = pickFirst($, rules.selectors?.currency, rules.attrs?.currency);
  if (priceRaw) {
    const cleansed = applyCleanse(priceRaw, rules.cleanse?.price);
    const pm = runTransform("parseMoneyRo", cleansed) as ReturnType<typeof parseMoneyRo>;
    priceVal = pm.value;
    currency = pm.currency;
  }
  if (!currency && curRaw)
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    currency = runTransform("detectCurrency", curRaw) as any;

  // area
  let areaM2: number | null = null;
  const areaRaw = pickFirst($, rules.selectors?.areaM2, rules.attrs?.areaM2);
  if (areaRaw) {
    const cleansed = applyCleanse(areaRaw, rules.cleanse?.areaM2);
    areaM2 = runTransform("parseArea", cleansed) as number | null;
  }

  // rooms
  let rooms: number | null = null;
  const roomsRaw = pickFirst($, rules.selectors?.rooms, rules.attrs?.rooms);
  if (roomsRaw) {
    const cleansed = applyCleanse(roomsRaw, rules.cleanse?.rooms);
    rooms = runTransform("parseRooms", cleansed) as number | null;
  }

  // floor/year/address
  const floorRaw = pickFirst($, rules.selectors?.floorRaw, rules.attrs?.floorRaw) ?? null;
  const yearBuilt = parseYear(
    pickFirst($, rules.selectors?.yearBuilt, rules.attrs?.yearBuilt) ?? null,
  );
  const addressRaw = normalizeAddress(
    pickFirst($, rules.selectors?.addressRaw, rules.attrs?.addressRaw) ?? null,
  );

  // photos
  const photoSel = rules.selectors?.photos;
  const photoAttr = rules.attrs?.photoUrl || "src";
  const photos: Extracted["photos"] = [];
  for (const sel of (Array.isArray(photoSel) ? photoSel : [photoSel]).filter(Boolean) as string[]) {
    $(sel).each((_, el) => {
      const url = preferLg($(el).attr(photoAttr) || "") || null;
      if (url && !photos.find((p) => p.url === url)) photos.push({ url });
    });
    if (photos.length) break; // primul selector cu rezultate câștigă
  }

  return {
    title,
    price: priceVal,
    currency: currency ?? null,
    areaM2,
    rooms,
    floorRaw,
    yearBuilt,
    addressRaw,
    photos,
    sourceMeta: { via: "profile" },
  };
}
