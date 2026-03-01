import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

export const authConfig = {
  // @ts-expect-error - Adapter version mismatch between next-auth beta and @auth/prisma-adapter
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.EMAIL_SERVER || process.env.SMTP_URL
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER || process.env.SMTP_URL || "",
            from: process.env.EMAIL_FROM || "noreply@imob.ro",
            async sendVerificationRequest({ identifier: email, url }) {
              if (process.env.NODE_ENV === "development") {
                logger.info({ email, url }, "Magic link generated (dev only)");
              }
            },
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }: { session: Record<string, unknown>; user: { id: string; role?: string } }) {
      const s = session as { user?: { id?: string; role?: string } };
      if (s?.user) {
        s.user.id = user.id;
        s.user.role = user.role || "user";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  trustHost: true,
} satisfies NextAuthConfig;

// @ts-expect-error - Adapter version mismatch between next-auth beta and @auth/prisma-adapter
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
