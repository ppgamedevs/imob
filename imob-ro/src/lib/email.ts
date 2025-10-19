export async function sendEmail(to: string, subject: string, html: string) {
  // Try to use RESEND_API_KEY env and the resend API if configured
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "no-reply@imob.ro",
          to: [to],
          subject,
          html,
        }),
      });
      return;
    } catch (e) {
      console.warn("resend send failed", e);
    }
  }

  // Fallback: log
  console.info(`sendEmail fallback to console: to=${to} subject=${subject}`);
}
