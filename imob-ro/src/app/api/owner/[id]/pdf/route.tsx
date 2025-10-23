import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.ownerLead.findUnique({
    where: { id },
  });

  if (!lead) {
    return new Response("Not found", { status: 404 });
  }

  // Track PDF generation event
  await prisma.ownerLeadEvent.create({
    data: {
      leadId: lead.id,
      kind: "pdf",
      meta: {},
    },
  });

  // TODO: Integrate with existing PDF infrastructure from Day 22
  // For now, return a simple text response
  const content = `
Raport Evaluare Proprietate - imob.ro

Zona: ${lead.areaSlug ? lead.areaSlug.replace(/-/g, " ") : "N/A"}
Adresa: ${lead.addressHint || "Confidențială"}

PREȚ RECOMANDAT: ${lead.priceSuggested ? lead.priceSuggested.toLocaleString() + " €" : "N/A"}

Interval AVM:
- Minim: ${lead.avmLow ? lead.avmLow.toLocaleString() + " €" : "N/A"}
- Mediu: ${lead.avmMid ? lead.avmMid.toLocaleString() + " €" : "N/A"}
- Maxim: ${lead.avmHigh ? lead.avmHigh.toLocaleString() + " €" : "N/A"}

Timp estimat vânzare: ${lead.ttsBucket || "N/A"}

Detalii:
- Camere: ${lead.rooms || "N/A"}
- Suprafață: ${lead.areaM2 ? lead.areaM2 + " m²" : "N/A"}
- An construcție: ${lead.yearBuilt || "N/A"}

${
  lead.estRent && lead.yieldNet
    ? `
Potențial închiriere:
- Chirie estimată: ${lead.estRent.toLocaleString()} € / lună
- Randament net: ${(lead.yieldNet * 100).toFixed(1)}%
`
    : ""
}

Recomandări:
- Fotografii profesionale pot crește viteza de vânzare cu 20%
- Descriere completă cu toate detaliile (poziție, parcare, boxă)
${lead.conditionScore && lead.conditionScore < 0.5 ? "- Renovare ușoară poate crește prețul cu 5-8%" : ""}
${lead.yearBuilt && lead.yearBuilt < 1990 ? "- Modernizare (geamuri, centrală) poate aduce plus 3-5%" : ""}

---
Evaluare realizată automat (AVM). Nu constituie consultanță financiară profesională.
Pentru evaluare oficială, consultați un expert autorizat.
  `;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="Evaluare-${lead.id.slice(0, 8)}.txt"`,
    },
  });
}
