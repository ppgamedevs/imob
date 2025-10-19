/* eslint-disable @typescript-eslint/no-explicit-any */
export type NormalizedFeatures = {
  areaSlug?: string | null;
  city?: string | null;
  areaM2?: number | null;
  level?: number | null;
  yearBuilt?: number | null;
  distMetroM?: number | null;
  conditionScore?: number | null;
  priceEur?: number | null;
  comps?: Array<Record<string, any>> | null;
  photos?: string[] | null;
  [key: string]: any;
};
