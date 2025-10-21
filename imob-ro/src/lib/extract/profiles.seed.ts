import type { ExtractProfileRules } from "./types";

export const defaultProfile: ExtractProfileRules = {
  notes: "Fallback generic",
  selectors: {
    title: ["h1", "title"],
    price: ["[class*=price]", "meta[itemprop=price]", "body"],
    currency: ["[class*=price]", "meta[itemprop=priceCurrency]"],
    areaM2: ["[class*=supraf]", "[class*=mp]", "body"],
    rooms: ["[class*=camere]", "body"],
    floorRaw: ["[class*=etaj]", "body"],
    yearBuilt: ["[class*=an]", "body"],
    addressRaw: ["[class*=adresa]", "body"],
    photos: ["img"],
  },
  attrs: {
    title: undefined,
    price: undefined,
    currency: undefined,
    areaM2: undefined,
    rooms: undefined,
    floorRaw: undefined,
    yearBuilt: undefined,
    addressRaw: undefined,
    photoUrl: "src",
  },
  cleanse: {
    price: [
      ["\\.", ""],
      ["\\s", ""],
    ],
  },
  transform: {
    price: "parseMoneyRo",
    areaM2: "parseArea",
    rooms: "parseRooms",
    floorRaw: "normalizeFloor",
    yearBuilt: "parseYear",
    currency: "detectCurrency",
    addressRaw: "normalizeAddress",
    photoUrl: "preferLg",
  },
};

// Placeholder: editezi selectoarele în Admin UI după QA
export const imobiliareRo: ExtractProfileRules = {
  notes: "Imobiliare.ro – personalizați după QA",
  selectors: {
    title: ["h1", "title"],
    price: ["[data-cy=price]", "[class*=price]"],
    currency: ["[data-cy=price]", "[class*=price]"],
    areaM2: ["[class*=supraf]", "[class*=mp]"],
    rooms: ["[class*=camere]"],
    floorRaw: ["[class*=etaj]"],
    yearBuilt: ["[class*=an]"],
    addressRaw: ["[class*=address]", "[class*=adresa]"],
    photos: ["[data-cy=gallery] img", "img"],
  },
  attrs: { photoUrl: "src" },
  transform: {
    price: "parseMoneyRo",
    areaM2: "parseArea",
    rooms: "parseRooms",
    floorRaw: "normalizeFloor",
    yearBuilt: "parseYear",
    currency: "detectCurrency",
    addressRaw: "normalizeAddress",
    photoUrl: "preferLg",
  },
};

export const storiaRo: ExtractProfileRules = {
  ...defaultProfile,
  notes: "Storia.ro – ajustați",
};
export const olxRo: ExtractProfileRules = {
  ...defaultProfile,
  notes: "OLX – ajustați",
};
