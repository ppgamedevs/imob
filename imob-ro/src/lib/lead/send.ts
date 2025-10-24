/**
 * Lead Email Sender - Forward lead to owner/agent
 *
 * Sends lead notification emails using Resend API
 */

interface LeadEmailData {
  name?: string;
  contact: string;
  message: string;
}

interface PropertyContext {
  title: string;
  priceEur: number;
  area?: string;
  reportUrl: string;
}

/**
 * Send lead notification to owner/agent
 * Returns true if sent, false if failed
 */
export async function sendOwnerEmail(
  analysisId: string,
  leadData: LeadEmailData,
  propertyContext: PropertyContext,
  recipientEmail?: string,
): Promise<boolean> {
  // Skip if no Resend API key or recipient email
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !recipientEmail) {
    console.warn(
      `[Lead] No email sent for ${analysisId} - missing API key or recipient`,
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "leads@imob.ro",
        to: recipientEmail,
        reply_to: leadData.contact,
        subject: `Cerere de contact: ${propertyContext.title}`,
        html: generateEmailHTML(leadData, propertyContext),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Lead] Email send failed: ${error}`);
      return false;
    }

    const data = await response.json();
    console.log(`[Lead] Email sent: ${data.id}`);
    return true;
  } catch (error) {
    console.error(`[Lead] Email send error:`, error);
    return false;
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(
  lead: LeadEmailData,
  property: PropertyContext,
): string {
  const { name, contact, message } = lead;
  const { title, priceEur, area, reportUrl } = property;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0ea5e9; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; }
    .property { background: white; padding: 16px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
    .property h3 { margin: 0 0 8px; color: #1f2937; }
    .property .price { font-size: 24px; font-weight: bold; color: #0ea5e9; margin: 8px 0; }
    .property .area { color: #6b7280; font-size: 14px; }
    .lead-info { background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #0ea5e9; }
    .lead-info strong { color: #1f2937; }
    .message { background: white; padding: 16px; border-radius: 6px; white-space: pre-wrap; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📬 Cerere Nouă de Contact</h2>
    </div>
    
    <div class="content">
      <div class="property">
        <h3>${title}</h3>
        <div class="price">€${priceEur.toLocaleString("ro-RO")}</div>
        ${area ? `<div class="area">📍 ${area}</div>` : ""}
      </div>

      <div class="lead-info">
        <p><strong>De la:</strong> ${name || "Vizitator"}</p>
        <p><strong>Contact:</strong> <a href="${contact.includes("@") ? `mailto:${contact}` : `tel:${contact}`}">${contact}</a></p>
      </div>

      <div class="message">
        <strong>Mesaj:</strong><br><br>
        ${message}
      </div>

      <a href="${reportUrl}" class="button">Vezi Raportul Complet</a>
    </div>

    <div class="footer">
      <p>Acest email a fost generat automat de <strong>imob.ro</strong></p>
      <p>Răspunde direct la acest email pentru a contacta persoana interesată.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send lead confirmation to user (optional)
 */
export async function sendUserConfirmation(
  userEmail: string,
  propertyTitle: string,
  referenceCode: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "noreply@imob.ro",
        to: userEmail,
        subject: "Confirmăm primirea cererii tale",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Mesajul tău a fost trimis</h2>
            <p>Mulțumim pentru interesul manifestat pentru <strong>${propertyTitle}</strong>.</p>
            <p>Proprietarul sau agentul va primi mesajul tău și te va contacta în cel mai scurt timp.</p>
            <p style="color: #6b7280; font-size: 14px;">Cod referință: <strong>${referenceCode}</strong></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">Dacă nu ai solicitat acest mesaj, poți ignora acest email.</p>
          </div>
        `,
      }),
    });
    return true;
  } catch (error) {
    console.error("[Lead] User confirmation failed:", error);
    return false;
  }
}
