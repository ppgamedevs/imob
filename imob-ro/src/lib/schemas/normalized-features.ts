import { z } from "zod";

export const NormalizedFeaturesSchema = z.object({
  title: z.string().nullable().optional(),
  price_eur: z.number().int().nullable().optional(),
  price_ron: z.number().int().nullable().optional(),
  currency: z.string().nullable().optional(),
  area_m2: z.number().nullable().optional(),
  rooms: z.number().nullable().optional(),
  floor: z.number().nullable().optional(),
  year_built: z.number().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  address_raw: z.string().nullable().optional(),
  area_slug: z.string().nullable().optional(),
  // older zod versions expect a key schema and a value schema; use string keys -> any values
  address_components: z.record(z.string(), z.any()).nullable().optional(),
  photos: z.array(z.string()).nullable().optional(),
  dist_to_metro: z.number().nullable().optional(),
  time_to_metro_min: z.number().nullable().optional(),
  dist_to_office: z.number().nullable().optional(),
  time_to_office_min: z.number().nullable().optional(),
});

export type NormalizedFeatures = z.infer<typeof NormalizedFeaturesSchema>;
