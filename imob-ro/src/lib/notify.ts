import { prisma } from "@/lib/db";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) return false;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Imob <alerts@your-domain>",
      to: [to],
      subject,
      text,
    }),
  });
  return resp.ok;
}

export async function deliverNotifications(
  items: { ruleId: string; userId: string; title: string; message: string; url?: string }[],
) {
  for (const it of items) {
    await (prisma as any).reportUsage.create({
      data: {
        userId: it.userId,
        analysisId: null,
        action: "ALERT",
        meta: { title: it.title, message: it.message, url: it.url } as any,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: it.userId },
      select: { email: true },
    });
    if (user?.email) {
      const app = process.env.NEXT_PUBLIC_APP_URL || "";
      await sendEmail(user.email, it.title, `${it.message}${it.url ? `\n${app}${it.url}` : ""}`);
    }
  }
}
