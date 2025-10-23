"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { Prisma } from "@prisma/client";

// Validation schema for extractor profile
const extractorProfileSchema = z.object({
  domain: z.string().min(1, "Domain is required").toLowerCase().trim(),
  active: z.boolean(),
  rules: z.any(), // JSON object - will be cast to Prisma.InputJsonValue
  version: z.number().int().positive().default(1),
  id: z.string().uuid().optional(),
});

export async function upsertExtractorProfile(formData: FormData) {
  // Admin guard
  await requireAdmin();

  const id = formData.get("id") as string;
  const domain = (formData.get("domain") as string).trim().toLowerCase();
  const active = formData.get("active") === "on";
  const rulesJson = formData.get("rules") as string;
  const version = parseInt(formData.get("version") as string, 10) || 1;

  // Parse and validate rules JSON
  let rules = null;
  try {
    rules = JSON.parse(rulesJson);
  } catch {
    throw new Error("Invalid JSON in rules field");
  }

  // Validate all input
  const validated = extractorProfileSchema.parse({
    id: id && id !== "new" ? id : undefined,
    domain,
    active,
    rules,
    version,
  });

  if (validated.id) {
    await prisma.extractorProfile.update({
      where: { id: validated.id },
      data: {
        domain: validated.domain,
        active: validated.active,
        rules: validated.rules as Prisma.InputJsonValue,
        version: validated.version,
      },
    });
  } else {
    await prisma.extractorProfile.create({
      data: {
        domain: validated.domain,
        active: validated.active,
        rules: validated.rules as Prisma.InputJsonValue,
        version: validated.version,
      },
    });
  }
  revalidatePath("/admin/extractors");
  redirect("/admin/extractors");
}
