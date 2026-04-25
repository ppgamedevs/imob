import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/http/escape-html";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

const HOURS = 24;
const BATCH = 25;
const SUBJECT = "Dorești încă să vezi raportul complet? — ImobIntel";

type ProcessResult = { scanned: number; sent: number; skippedNoConsent: number; errors: number };

function appBaseUrl(): string {
  const b = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (b) return b;
  return "https://imobintel.ro";
}

/**
 * One reminder per ReportUnlock, only if:
 * - still pending, older than 24h, no reminder sent
 * - we have an email on the row (logged-in / known before Stripe)
 * - same analysisId + email has ReportLead with consent: true
 *
 * No repeated emails: guarded by `abandonmentReminderSentAt`.
 */
export async function processReportUnlockAbandonmentReminders(): Promise<ProcessResult> {
  const out: ProcessResult = {
    scanned: 0,
    sent: 0,
    skippedNoConsent: 0,
    errors: 0,
  };
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[report-unlock-reminder] RESEND_API_KEY not set; skipping (rows remain eligible for a future run)",
    );
    return out;
  }

  const cutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  const rows = await prisma.reportUnlock.findMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoff },
      abandonmentReminderSentAt: null,
      email: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: {
      id: true,
      analysisId: true,
      email: true,
    },
  });

  const base = appBaseUrl();

  for (const row of rows) {
    out.scanned += 1;
    const em = (row.email ?? "").trim().toLowerCase();
    if (!em) continue;

    const lead = await prisma.reportLead.findUnique({
      where: { analysisId_email: { analysisId: row.analysisId, email: em } },
      select: { consent: true },
    });
    if (!lead?.consent) {
      out.skippedNoConsent += 1;
      continue;
    }

    const reportUrl = `${base}/report/${row.analysisId}`;
    const reportUrlH = escapeHtml(reportUrl);
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#1e293b;max-width:520px;">
  <p>Salut,</p>
  <p>Ți-am observat o tentativă de plată informată, care nu a fost finalizată. Dacă încă dorești accesul la <strong>raportul complet</strong> (estimare, comparabile, riscuri, negociere, PDF), te poți întoarce oricând la pagina raportului:</p>
  <p><a href="${reportUrlH}" style="color:#0f172a;font-weight:600;">${reportUrlH}</a></p>
  <p style="color:#64748b;font-size:13px;">Acesta este <strong>un singur</strong> mesaj de reamintire; nu trimitem serii automată. Dacă nu mai ești interesat, te rugăm să ignori acest e-mail. Pentru a primi acest răspuns, am folosit e-mailul lăsat în formularul de acord (previzualizare raport).</p>
  <p style="color:#94a3b8;font-size:12px;">ImobIntel: analiză orientativă, nu consiliere juridică. Decizia cumpărării îți aparține.</p>
</body>
</html>`;

    try {
      await sendEmail(em, SUBJECT, html);
      const n = await prisma.reportUnlock.updateMany({
        where: { id: row.id, status: "pending", abandonmentReminderSentAt: null },
        data: { abandonmentReminderSentAt: new Date() },
      });
      if (n.count > 0) out.sent += 1;
    } catch (e) {
      out.errors += 1;
      logger.warn({ e, reportUnlockId: row.id }, "Report unlock reminder send failed");
    }
  }

  return out;
}
