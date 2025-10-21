"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

export async function upsertExtractorProfile(formData: FormData) {
  const id = formData.get("id") as string;
  const domain = (formData.get("domain") as string).trim().toLowerCase();
  const active = formData.get("active") === "on";
  const rulesJson = formData.get("rules") as string;
  const version = parseInt(formData.get("version") as string, 10) || 1;

  let rules = null;
  try {
    rules = JSON.parse(rulesJson);
  } catch {
    throw new Error("Invalid JSON in rules field");
  }

  if (id && id !== "new") {
    await prisma.extractorProfile.update({
      where: { id },
      data: { domain, active, rules, version },
    });
  } else {
    await prisma.extractorProfile.create({
      data: { domain, active, rules, version },
    });
  }
  revalidatePath("/admin/extractors");
  redirect("/admin/extractors");
}
