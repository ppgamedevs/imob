"use server";

import { prisma } from "@/lib/db";
import { estimateAVMFromFeatures } from "@/lib/ml/owner-avm";
import { estimateRent } from "@/lib/ml/rent";
import { estimateTTS } from "@/lib/ml/tts";

export async function createOwnerLead(formData: FormData) {
  const city = "București";
  const areaSlug = (formData.get("areaSlug") as string) || null;
  const addressHint = (formData.get("addressHint") as string) || null;
  const rooms = formData.get("rooms") ? Number(formData.get("rooms")) : null;
  const areaM2 = formData.get("areaM2") ? Number(formData.get("areaM2")) : null;
  const yearBuilt = formData.get("yearBuilt") ? Number(formData.get("yearBuilt")) : null;
  const conditionScore = formData.get("conditionScore")
    ? Number(formData.get("conditionScore"))
    : null;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const lead = await prisma.ownerLead.create({
    data: {
      city,
      areaSlug,
      addressHint,
      rooms,
      areaM2,
      yearBuilt,
      conditionScore,
      email,
      phone,
      notes,
      status: "new",
    },
  });

  await prisma.ownerLeadEvent.create({
    data: {
      leadId: lead.id,
      kind: "submit",
      meta: { hasContact: !!(email || phone) },
    },
  });

  return { ok: true, id: lead.id };
}

export async function calcOwnerLead(leadId: string) {
  const lead = await prisma.ownerLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const features = {
    city: lead.city,
    areaSlug: lead.areaSlug,
    areaM2: lead.areaM2 ?? undefined,
    rooms: lead.rooms ?? undefined,
    yearBuilt: lead.yearBuilt ?? undefined,
    distMetroM: undefined,
    conditionScore: lead.conditionScore ?? undefined,
  };

  // AVM estimation
  const avm = await estimateAVMFromFeatures(features);
  const { low, mid, high, conf } = avm;

  // TTS estimation
  const month = new Date().getMonth() + 1;
  const tts = mid
    ? await estimateTTS({
        avmMid: mid,
        asking: mid,
        areaSlug: lead.areaSlug ?? undefined,
        month,
        areaM2: lead.areaM2 ?? undefined,
        conditionScore: lead.conditionScore ?? undefined,
      })
    : null;

  // Rent estimation
  const rent = await estimateRent({
    city: lead.city,
    areaSlug: lead.areaSlug ?? null,
    areaM2: lead.areaM2 ?? null,
    rooms: lead.rooms ?? null,
    yearBuilt: lead.yearBuilt ?? null,
    distMetroM: null,
    conditionScore: lead.conditionScore ?? null,
  });

  // Yield calculation
  const yieldNet =
    rent?.rentEur && mid ? computeNetYield(rent.rentEur, mid) : null;

  // Price suggestion
  const priceSuggested = suggestListPrice(mid, conf, tts?.bucket);

  // Update lead with calculations
  const updated = await prisma.ownerLead.update({
    where: { id: leadId },
    data: {
      avmLow: low ?? null,
      avmMid: mid ?? null,
      avmHigh: high ?? null,
      ttsBucket: tts?.bucket ?? null,
      estRent: rent?.rentEur ?? null,
      yieldNet: yieldNet ?? null,
      priceSuggested: priceSuggested ?? null,
    },
  });

  await prisma.ownerLeadEvent.create({
    data: {
      leadId,
      kind: "calc",
      meta: { conf, ttsBucket: tts?.bucket, rent: rent?.rentEur },
    },
  });

  return {
    ok: true,
    data: updated,
    avm: { low, mid, high, conf },
    tts,
    rent,
  };
}

function computeNetYield(rentEur: number, priceEur: number) {
  const annual = rentEur * 12;
  const opex = annual * 0.15; // 15% operating expenses
  return (annual - opex) / priceEur;
}

function suggestListPrice(
  mid: number | null,
  conf?: number,
  bucket?: string,
): number | null {
  if (!mid) return null;

  const bump = Math.min(0.015, (conf ?? 0.7) * 0.01);

  if (!bucket) return Math.round(mid);

  // Fast selling market - price slightly above
  if (/sub|<\s*60/i.test(bucket)) {
    return Math.round(mid * (1 + bump));
  }

  // Slow market - price slightly below
  if (/>\s*120|180/i.test(bucket)) {
    return Math.round(mid * 0.98);
  }

  // Normal market - at mid
  return Math.round(mid);
}

export async function updateLeadStatus(leadId: string, status: string) {
  await prisma.ownerLead.update({
    where: { id: leadId },
    data: { status, updatedAt: new Date() },
  });

  await prisma.ownerLeadEvent.create({
    data: {
      leadId,
      kind: "status_change",
      meta: { newStatus: status },
    },
  });

  return { ok: true };
}
