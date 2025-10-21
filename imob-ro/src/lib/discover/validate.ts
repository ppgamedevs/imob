import { z } from "zod";

export const discoverSchema = z.object({
  area: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  eurm2Min: z.coerce.number().nonnegative().optional(),
  eurm2Max: z.coerce.number().nonnegative().optional(),
  m2Min: z.coerce.number().nonnegative().optional(),
  m2Max: z.coerce.number().nonnegative().optional(),
  roomsMin: z.coerce.number().nonnegative().optional(),
  roomsMax: z.coerce.number().nonnegative().optional(),
  yearMin: z.coerce.number().int().optional(),
  yearMax: z.coerce.number().int().optional(),
  metroMaxM: z.coerce.number().int().optional(),
  underpriced: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .transform((v) => v === "1" || v === "true")
    .optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});
