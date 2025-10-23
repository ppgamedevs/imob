/**
 * Day 29: Saved Search Validation
 * Zod schema with coercion for URL params and form data
 */

import { z } from "zod";

export const SavedQuerySchema = z.object({
  // Location
  areas: z.array(z.string()).optional(),
  city: z.literal("București").optional(),

  // Price
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  eurM2Min: z.coerce.number().nonnegative().optional(),
  eurM2Max: z.coerce.number().nonnegative().optional(),

  // Property
  m2Min: z.coerce.number().positive().optional(),
  m2Max: z.coerce.number().positive().optional(),
  rooms: z.array(z.coerce.number()).optional(),
  yearMin: z.coerce.number().min(1900).optional(),
  yearMax: z.coerce.number().max(2030).optional(),

  // Smart filters
  metroMaxM: z.coerce.number().positive().optional(),
  underpriced: z.coerce.boolean().optional(),
  tts: z.enum(["fast", "normal", "slow"]).optional(),
  keywords: z.array(z.string()).optional(),

  // Sort
  sort: z
    .enum(["new", "price_asc", "price_desc", "eurm2_asc", "eurm2_desc", "yield_desc"])
    .optional(),

  // Budget
  budget: z
    .object({
      cash: z.coerce.number().optional(),
      mortgage: z
        .object({
          downPct: z.coerce.number().min(0).max(1).optional(),
          maxRate: z.coerce.number().min(0).max(0.3).optional(),
        })
        .optional(),
    })
    .optional(),

  // Advanced
  dedup: z.coerce.boolean().optional(),
  limit: z.coerce.number().max(200).optional(),
});

export type SavedQueryValidated = z.infer<typeof SavedQuerySchema>;
