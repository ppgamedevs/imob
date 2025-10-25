/**
 * Step 7: Search types and interfaces
 */

export type SuggestKind =
  | "area"
  | "address"
  | "listing"
  | "group"
  | "developer"
  | "saved"
  | "page"
  | "sponsored";

export type SuggestItemBase = {
  kind: SuggestKind;
  href: string;
  highlight?: string;
};

export type AreaSuggestItem = SuggestItemBase & {
  kind: "area";
  slug: string;
  name: string;
  city: string;
  listingsNow?: number;
};

export type AddressSuggestItem = SuggestItemBase & {
  kind: "address";
  name: string;
  lat: number;
  lng: number;
  areaSlug?: string;
};

export type ListingSuggestItem = SuggestItemBase & {
  kind: "listing";
  id: string;
  title: string;
  priceEur: number;
  eurM2: number;
  avmBadge?: "under" | "fair" | "over";
  thumb?: string;
};

export type GroupSuggestItem = SuggestItemBase & {
  kind: "group";
  id: string;
  title: string;
  priceEur: number;
  eurM2: number;
  badges: string[];
  thumb?: string;
};

export type DeveloperSuggestItem = SuggestItemBase & {
  kind: "developer";
  id: string;
  name: string;
};

export type SavedSuggestItem = SuggestItemBase & {
  kind: "saved";
  type: "filter" | "area";
  label: string;
};

export type PageSuggestItem = SuggestItemBase & {
  kind: "page";
  title: string;
};

export type SponsoredSuggestItem = SuggestItemBase & {
  kind: "sponsored";
  section: "listings" | "areas";
  payload: AreaSuggestItem | ListingSuggestItem | GroupSuggestItem;
};

export type SuggestItem =
  | AreaSuggestItem
  | AddressSuggestItem
  | ListingSuggestItem
  | GroupSuggestItem
  | DeveloperSuggestItem
  | SavedSuggestItem
  | PageSuggestItem
  | SponsoredSuggestItem;

export type SuggestSections = {
  areas: SuggestItem[];
  addresses: SuggestItem[];
  listings: SuggestItem[];
  saved: SuggestItem[];
  pages: SuggestItem[];
};

export type SuggestResponse = {
  sections: SuggestSections;
  meta: {
    q: string;
    tookMs: number;
  };
};

export type CommandAction = {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  onExecute: () => void;
};
