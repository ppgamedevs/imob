export type Extracted = {
  title?: string | null;
  price?: number | null;
  currency?: "EUR" | "USD" | "RON" | null;
  areaM2?: number | null;
  rooms?: number | null;
  floorRaw?: string | null;
  yearBuilt?: number | null;
  addressRaw?: string | null;
  lat?: number | null;
  lng?: number | null;
  photos?: Array<{ url: string; width?: number; height?: number }>;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  sourceMeta?: any;
};

export type ExtractProfileRules = {
  notes?: string;
  // CSS selectors; value poate fi string sau array (fallback chain)
  selectors?: {
    title?: string | string[];
    price?: string | string[];
    currency?: string | string[];
    areaM2?: string | string[];
    rooms?: string | string[];
    floorRaw?: string | string[];
    yearBuilt?: string | string[];
    addressRaw?: string | string[];
    photos?: string | string[]; // <img> selector
    lat?: string | string[]; // meta itemprop, script JSON etc. (opțional)
    lng?: string | string[];
  };
  // atribute pentru imagini sau valori (ex: 'content' pt. meta)
  attrs?: {
    title?: string;
    price?: string;
    currency?: string;
    areaM2?: string;
    rooms?: string;
    floorRaw?: string;
    yearBuilt?: string;
    addressRaw?: string;
    photoUrl?: string; // ex: data-src, srcset
  };
  // regex-uri/replace-uri pentru curățare
  cleanse?: {
    price?: Array<[string, string]>; // ex: [[ "\\.", "" ], [ "\\s", "" ]]
    areaM2?: Array<[string, string]>;
    rooms?: Array<[string, string]>;
  };
  // map de funcții built-in (by key); vezi transforms helper
  transform?: {
    price?: "parseMoneyRo";
    areaM2?: "parseArea";
    rooms?: "parseRooms";
    floorRaw?: "normalizeFloor";
    yearBuilt?: "parseYear";
    currency?: "detectCurrency";
    addressRaw?: "normalizeAddress";
    photoUrl?: "preferLg";
  };
};
