import { NextResponse } from "next/server";
import OpenAI from "openai";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

export const runtime = "nodejs";

const FREE_MSG_LIMIT = 3;
const PRO_MSG_LIMIT = 50;
const SESSION_KEY_PREFIX = "chat_msg_count:";

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, timeout: 20_000 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: analysisId } = await params;
  const body = await req.json().catch(() => ({}));
  const userMessage = body?.message;
  const history: Array<{ role: string; content: string }> = body?.history ?? [];

  if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length < 2) {
    return NextResponse.json({ error: "Mesajul este prea scurt." }, { status: 400 });
  }

  if (userMessage.length > 1000) {
    return NextResponse.json({ error: "Mesajul este prea lung (max 1000 caractere)." }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  // Check message limits
  let msgLimit = FREE_MSG_LIMIT;
  if (userId) {
    const sub = await prisma.subscription.findUnique({ where: { userId } }).catch(() => null);
    if (sub && sub.planCode !== "free") {
      msgLimit = PRO_MSG_LIMIT;
    }
  }

  // Count messages this session via a simple DB counter
  const periodKey = `${SESSION_KEY_PREFIX}${analysisId}:${userId ?? req.headers.get("x-forwarded-for") ?? "anon"}`;
  let currentCount = 0;
  try {
    const existing = await prisma.apiAudit.count({
      where: {
        endpoint: "chat",
        action: periodKey,
        ts: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    currentCount = existing;
  } catch { /* ignore */ }

  if (currentCount >= msgLimit) {
    return NextResponse.json({
      error: msgLimit === FREE_MSG_LIMIT
        ? `Ai atins limita de ${FREE_MSG_LIMIT} mesaje gratuite pentru acest raport. Creeaza un cont Pro pentru mai multe.`
        : `Ai atins limita de ${PRO_MSG_LIMIT} mesaje pentru acest raport.`,
      limitReached: true,
    }, { status: 429 });
  }

  // Load report context
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { extractedListing: true },
  });

  if (!analysis || !analysis.extractedListing) {
    return NextResponse.json({ error: "Raportul nu a fost gasit." }, { status: 404 });
  }

  const ext = analysis.extractedListing;
  const meta = ext.sourceMeta as Record<string, unknown> | null;
  const llm = ext.llmTextExtract as Record<string, unknown> | null;

  const contextParts: string[] = [
    `Titlu anunt: ${ext.title ?? "N/A"}`,
    `Pret: ${ext.price ? `${ext.price} ${ext.currency ?? "EUR"}` : "N/A"}`,
    `Suprafata: ${ext.areaM2 ? `${ext.areaM2} mp` : "N/A"}`,
    `Camere: ${ext.rooms ?? "N/A"}`,
    `Etaj: ${ext.floorRaw ?? ext.floor ?? "N/A"}`,
    `An constructie: ${ext.yearBuilt ?? "N/A"}`,
    `Adresa: ${ext.addressRaw ?? "N/A"}`,
    `URL sursa: ${analysis.sourceUrl}`,
  ];

  if (meta?.description) {
    contextParts.push(`Descriere anunt: ${String(meta.description).slice(0, 1500)}`);
  }
  if (meta?.sellerType) {
    contextParts.push(`Tip vanzator: ${meta.sellerType}`);
  }
  if (llm?.summary) {
    contextParts.push(`Rezumat analiza: ${llm.summary}`);
  }
  if (llm?.condition) {
    contextParts.push(`Stare: ${llm.condition}`);
  }
  if (Array.isArray(llm?.redFlags) && (llm.redFlags as string[]).length > 0) {
    contextParts.push(`Semnale de alarma: ${(llm.redFlags as string[]).join("; ")}`);
  }
  if (Array.isArray(llm?.positives) && (llm.positives as string[]).length > 0) {
    contextParts.push(`Puncte forte: ${(llm.positives as string[]).join("; ")}`);
  }

  const systemPrompt = `Esti un consultant imobiliar expert pe piata din Romania, pe platforma ImobIntel.
Raspunzi la intrebarile utilizatorului despre un anunt imobiliar specific.

Informatii despre anunt:
${contextParts.join("\n")}

Reguli:
- Raspunde INTOTDEAUNA in romana.
- Fii concis si util (max 3-4 propozitii per raspuns).
- Bazeaza-te pe datele disponibile. Daca nu ai informatia, spune sincer.
- Nu inventa date sau preturi.
- Poti sugera intrebari de pus vanzatorului.
- Daca utilizatorul intreaba ceva care nu are legatura cu imobiliare, redirectioneaza-l politicos.
- Nu mentiona ca esti un AI. Prezinta-te ca "asistentul ImobIntel".`;

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "Serviciul de chat nu este disponibil momentan." }, { status: 503 });
  }

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 10 messages max)
    for (const msg of history.slice(-10)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: userMessage.trim() });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.3,
    });

    const reply = response.choices[0]?.message?.content ?? "Nu am putut genera un raspuns.";

    // Track usage
    try {
      await prisma.apiAudit.create({
        data: {
          endpoint: "chat",
          action: periodKey,
          ip: req.headers.get("x-forwarded-for") || undefined,
          details: {
            analysisId,
            userId: userId ?? null,
            tokens: response.usage?.total_tokens ?? 0,
          },
        },
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      reply,
      messagesRemaining: msgLimit - currentCount - 1,
    });
  } catch (err) {
    logger.error({ err, analysisId }, "Chat API error");
    return NextResponse.json({ error: "Eroare la generarea raspunsului. Incearca din nou." }, { status: 500 });
  }
}
