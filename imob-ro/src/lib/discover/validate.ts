import { z } from "zod";

export const discoverSchema = z.object({
  // Areas (CSV or array)
  area: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  areas: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : v.split(",").filter(Boolean);
    }),

  // Price range
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  price: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const [min, max] = v.split("-").map(Number);
      return { min, max };
    }),

  // €/m² range
  eurm2Min: z.coerce.number().nonnegative().optional(),
  eurm2Max: z.coerce.number().nonnegative().optional(),
  eurm2: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const [min, max] = v.split("-").map(Number);
      return { min, max };
    }),

  // Size range
  m2Min: z.coerce.number().nonnegative().optional(),
  m2Max: z.coerce.number().nonnegative().optional(),
  m2: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const [min, max] = v.split("-").map(Number);
      return { min, max };
    }),

  // Rooms (CSV or array)
  roomsMin: z.coerce.number().nonnegative().optional(),
  roomsMax: z.coerce.number().nonnegative().optional(),
  rooms: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const arr = Array.isArray(v) ? v : v.split(",").filter(Boolean);
      return arr.map(Number).filter((n) => !isNaN(n));
    }),

  // Year range
  yearMin: z.coerce.number().int().optional(),
  yearMax: z.coerce.number().int().optional(),
  year: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (v.endsWith("+")) {
        return { min: Number(v.slice(0, -1)), max: undefined };
      }
      const [min, max] = v.split("-").map(Number);
      return { min, max };
    }),

  // Metro distance
  metroMaxM: z.coerce.number().int().optional(),
  metro: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (v.startsWith("<=")) {
        return Number(v.slice(2));
      }
      return Number(v);
    }),

  // Signals (CSV or array)
  underpriced: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .transform((v) => v === "1" || v === "true")
    .optional(),
  signals: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : v.split(",").filter(Boolean);
    }),

  // Sort
  sort: z
    .enum([
      "relevance",
      "price_asc",
      "price_desc",
      "eurm2_asc",
      "eurm2_desc",
      "yield_desc",
      "tts_asc",
    ])
    .optional(),

  // Pagination
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),

  // UI preferences (ignored by API, but accepted)
  density: z.enum(["comfortable", "compact"]).optional(),
});
