"use server";

import { requireSession } from "@/lib/a/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveBrand(formData: FormData) {
  const session = await requireSession();

  if (!session.orgId) {
    throw new Error("No organization found");
  }

  const slug = formData.get("slug") as string;
  const color = formData.get("color") as string;
  const logoUrl = formData.get("logoUrl") as string;

  await prisma.org.update({
    where: { id: session.orgId },
    data: {
      brand: {
        slug: slug || undefined,
        color: color || undefined,
        logoUrl: logoUrl || undefined,
      },
    },
  });

  revalidatePath("/a/brand");
}
