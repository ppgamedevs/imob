import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/db";

export const authConfig = {
  // @ts-expect-error - Adapter version mismatch between next-auth beta and @auth/prisma-adapter
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: "smtp://fake:fake@localhost:1025",
      from: "noreply@imob.ro",
      // Dev: log magic link to console (no SMTP)
      async sendVerificationRequest({ identifier: email, url }) {
        console.log("🔑 Magic link for", email);
        console.log("👉", url);
      },
    }),
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
    async session({ session, user }: any) {
      if (session?.user) {
        session.user.id = user.id;
        session.user.role = user.role || "user";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  trustHost: true, // Fix CORS and dynamic URL issues
} satisfies NextAuthConfig;

// @ts-expect-error - Adapter version mismatch between next-auth beta and @auth/prisma-adapter
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
