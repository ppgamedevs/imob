import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/http/escape-html";

const SUBJECT = "Raportul tău ImobIntel pentru anunțul verificat";

type Args = {
  to: string;
  reportUrl: string;
  /** Listing title, optional */
  propertyTitle: string | null;
};

/**
 * Send follow-up to someone who left email on a locked report preview.
 * Call only when consent is true. If RESEND is not configured, logs a warning and returns.
 */
export async function sendReportPreviewLeadEmail(args: Args): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    let reportPath: string | undefined;
    try {
      reportPath = new URL(args.reportUrl).pathname;
    } catch {
      reportPath = undefined;
    }
    console.warn(
      "[ReportLead] RESEND_API_KEY is not set; lead saved but no email was sent",
      { to: args.to, reportPath },
    );
    return;
  }

  const title = args.propertyTitle ? escapeHtml(args.propertyTitle) : "Anunțul tău analizat";
  const reportUrl = escapeHtml(args.reportUrl);
  const html = buildHtml({ title, reportUrl });

  try {
    await sendEmail(args.to, SUBJECT, html);
  } catch (e) {
    console.warn("[ReportLead] sendEmail failed after save", e);
  }
}

function buildHtml(args: { title: string; reportUrl: string }): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#1e293b;max-width:560px;">
  <p>Salut,</p>
  <p>Mulțumim pentru interes. Iată linkul înapoi la raportul generat de ImobIntel pentru: <strong>${args.title}</strong></p>
  <p><a href="${args.reportUrl}" style="color:#0f172a;">${args.reportUrl}</a></p>
  <h2 style="font-size:16px;margin-top:1.5em;">Ce include raportul complet (după deblocare)</h2>
  <ul style="padding-left:1.2em;">
    <li>Verdict orientativ pentru cumpărător și context pe piață (nu consultanță juridică)</li>
    <li>Interval de preț estimat și comparații utile, acolo unde datele permit</li>
    <li>Scor de încredere al analizei, explicat onest</li>
    <li>Riscuri și puncte de negociere, când există surse</li>
    <li>Checklist de vizionare / întrebări pentru agent</li>
    <li>Export PDF, după deblocare (același acces ca în raport)</li>
  </ul>
  <p>
    <a href="${args.reportUrl}" style="display:inline-block;margin-top:0.5em;padding:10px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:9999px;font-weight:600;">Deblochează raportul complet</a>
  </p>
  <p style="font-size:13px;color:#64748b;margin-top:2em;">Nu trimitem mesaje frecvente. Poți reveni oricând la linkul de mai sus. Dacă nu ai cerut acest e-mail, îl poți ignora.</p>
  <p style="font-size:12px;color:#94a3b8;">ImobIntel oferă analize orientative, pe baza anunțului și a datelor disponibile; deciziile rămân ale tale; pentru acte, verificări notariale sau juridice consultă un specialist.</p>
</body>
</html>`;
}
