"use server";

import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/a/email";
import { randomBytes } from "crypto";

export async function sendMagicLink(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const email = formData.get("email");

  if (!email || typeof email !== "string") {
    return { error: "Email is required" };
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address" };
  }

  try {
    // Generate token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token
    await prisma.magicToken.create({
      data: {
        token,
        email: email.toLowerCase(),
        expiresAt,
      },
    });

    // Send email
    await sendMagicLinkEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("Failed to send magic link:", error);
    return { error: "Failed to send magic link. Please try again." };
  }
}
