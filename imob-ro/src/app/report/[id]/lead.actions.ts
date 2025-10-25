"use server";

/**
 * Lead Server Actions - Handle contact form submissions
 *
 * Features:
 * - Zod validation
 * - Anti-spam guards (honeypot, timing, rate limit)
 * - Message sanitization
 * - Lead storage
 * - Optional email forwarding
 */

import { z } from "zod";

import { prisma } from "@/lib/db";
import { rateLimit, rateLimitComposite } from "@/lib/http/rate";
import {
  detectSuspiciousContent,
  isHoneypot,
  isTooFast,
  sanitizeMessage,
  validateContact,
} from "@/lib/lead/guards";
import { sendOwnerEmail, sendUserConfirmation } from "@/lib/lead/send";

// Validation schema
const LeadSchema = z.object({
  analysisId: z.string().min(1, "ID analiză lipsă"),
  name: z.string().optional(),
  contact: z.string().min(3, "Contact invalid"),
  message: z
    .string()
    .min(10, "Mesajul trebuie să aibă minim 10 caractere")
    .max(800, "Mesajul este prea lung"),
  consent: z.string().refine((val) => val === "true", {
    message: "Trebuie să accepți termenii și condițiile",
  }),
  hp: z.string().optional(), // honeypot
  _timestamp: z.string().optional(), // mount timestamp
});

type LeadFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  blocked?: boolean;
  rateLimited?: boolean;
  leadId?: string;
  message?: string;
};

/**
 * Create lead from contact form
 */
export async function createLeadAction(
  prevState: LeadFormState | null,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    // 1. Parse and validate form data
    const payload = {
      analysisId: formData.get("analysisId") as string,
      name: formData.get("name") as string,
      contact: formData.get("contact") as string,
      message: formData.get("message") as string,
      consent: formData.get("consent") as string,
      hp: formData.get("hp") as string,
      _timestamp: formData.get("_timestamp") as string,
    };

    const parsed = LeadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { analysisId, name, contact, message, hp, _timestamp } = parsed.data;

    // 2. Anti-spam guards

    // Honeypot check
    if (isHoneypot(hp)) {
      await logLead(analysisId, "honeypot", { hp });
      return {
        ok: false,
        blocked: true,
        message: "Cererea nu a putut fi procesată",
      };
    }

    // Timing check (reject submissions < 800ms from mount)
    if (_timestamp) {
      const mountTime = parseInt(_timestamp, 10);
      const elapsed = Date.now() - mountTime;
      if (elapsed < 800) {
        await logLead(analysisId, "too_fast", { elapsed });
        return {
          ok: false,
          blocked: true,
          message: "Te rog așteaptă câteva secunde",
        };
      }
    }

    // Rate limiting (3 submissions per 30 min per listing + per contact)
    try {
      await rateLimitComposite([
        { key: `lead:listing:${analysisId}`, max: 10, windowMs: 30 * 60 * 1000 }, // 10 per listing per 30min
        { key: `lead:contact:${contact}`, max: 3, windowMs: 30 * 60 * 1000 }, // 3 per contact per 30min
      ]);
    } catch (error) {
      await logLead(analysisId, "rate_limited", { contact });
      return {
        ok: false,
        rateLimited: true,
        message: "Ai trimis prea multe cereri. Te rog încearcă din nou peste 30 de minute.",
      };
    }

    // 3. Validate and normalize contact
    const validatedContact = validateContact(contact);
    if (!validatedContact) {
      return {
        ok: false,
        errors: { contact: ["Contact invalid. Te rog introdu email sau telefon valid."] },
      };
    }

    // 4. Sanitize message
    const sanitized = sanitizeMessage(message);

    // Detect suspicious patterns
    const suspicion = detectSuspiciousContent(sanitized);
    if (suspicion) {
      await logLead(analysisId, "suspicious", { reason: suspicion });
      return {
        ok: false,
        message: suspicion,
      };
    }

    // 5. Fetch property context for email
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        sourceUrl: true,
      },
    });

    if (!analysis) {
      return {
        ok: false,
        message: "Proprietatea nu a fost găsită",
      };
    }

    // 6. Create lead in database (using any available table or skip for now)
    // TODO: Add Lead model to Prisma schema
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // For now, log to console until Lead table is added
    console.log("[Lead] Created:", {
      id: leadId,
      analysisId,
      name,
      contact: validatedContact.value,
      contactType: validatedContact.type,
      message: sanitized,
    });

    // 7. Send email to owner/agent (optional, non-blocking)
    // Extract title and price from sourceUrl or use placeholder
    const propertyTitle = `Property #${analysisId}`;
    const priceEur = 0; // TODO: Get from analysis

    sendOwnerEmail(
      analysisId,
      { name, contact: validatedContact.value, message: sanitized },
      {
        title: propertyTitle,
        priceEur,
        area: undefined,
        reportUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/report/${analysisId}`,
      },
      undefined, // recipientEmail - TODO: get from source
    ).catch((error) => console.error("[Lead] Email send failed:", error));

    // 8. Send confirmation to user (if email)
    if (validatedContact.type === "email") {
      sendUserConfirmation(validatedContact.value, propertyTitle, leadId).catch(() => {});
    }

    // 9. Log success
    await logLead(analysisId, "ok", { leadId });

    return {
      ok: true,
      leadId,
      message: "Mesajul tău a fost trimis cu succes! 🎉",
    };
  } catch (error) {
    console.error("[Lead] Create action error:", error);
    return {
      ok: false,
      message: "A apărut o eroare. Te rog încearcă din nou sau contactează-ne direct.",
    };
  }
}

/**
 * Log lead activity for audit trail
 */
async function logLead(
  analysisId: string,
  status: string,
  meta: Record<string, any>,
): Promise<void> {
  try {
    // TODO: Add LeadLog model to Prisma schema
    console.log("[LeadLog]", { analysisId, status, meta });
  } catch (error) {
    console.error("[Lead] Log error:", error);
  }
}

/**
 * Track channel click (tel, email, WhatsApp)
 */
export async function trackChannelClick(
  analysisId: string,
  channel: "tel" | "email" | "whatsapp",
): Promise<void> {
  try {
    // TODO: Use proper analytics table or service
    console.log("[Analytics] channel_click", { analysisId, channel });
  } catch (error) {
    console.error("[Lead] Track error:", error);
  }
}
