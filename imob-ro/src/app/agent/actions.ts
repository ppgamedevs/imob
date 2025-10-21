"use server";
import { redirect } from "next/navigation";
import slugify from "slugify";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function upsertAgentProfile(form: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("auth");
  const userId = session.user.id;

  const fullName = String(form.get("fullName") || "").trim();
  const agencyName = String(form.get("agencyName") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const websiteUrl = String(form.get("websiteUrl") || "").trim();
  const avatarUrl = String(form.get("avatarUrl") || "").trim();
  const licenseId = String(form.get("licenseId") || "").trim();

  if (!fullName) throw new Error("Nume obligatoriu");
  const base = slugify(fullName, { lower: true, strict: true });
  const handle = base || userId.slice(0, 6);

  const existing = await prisma.agentProfile.findUnique({ where: { userId } }).catch(() => null);
  if (existing) {
    await prisma.agentProfile.update({
      where: { userId },
      data: { fullName, agencyName, phone, websiteUrl, avatarUrl, licenseId },
    });
    redirect(`/agent/${existing.handle}`);
  }

  // handle unic
  let h = handle;
  let i = 1;
  while (await prisma.agentProfile.findUnique({ where: { handle: h } })) {
    h = `${handle}-${i++}`;
  }

  await prisma.agentProfile.create({
    data: {
      userId,
      handle: h,
      fullName,
      agencyName,
      phone,
      websiteUrl,
      avatarUrl,
      licenseId,
    },
  });
  redirect(`/agent/${h}`);
}
