// Magic link email utilities

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const magicLink = `${baseUrl}/a/callback?token=${token}`;

  try {
    await resend.emails.send({
      from: "imob.ro <no-reply@imob.ro>",
      to: email,
      subject: "Sign in to your agent workspace",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to imob.ro</h2>
          <p>Click the link below to sign in to your agent workspace:</p>
          <p>
            <a href="${magicLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Sign in
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Link: ${magicLink}
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    throw new Error("Failed to send email");
  }
}
