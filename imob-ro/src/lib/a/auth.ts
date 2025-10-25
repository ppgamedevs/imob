// Agent workspace authentication utilities

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { AgentSession } from "@/types/agent";

const secret = new TextEncoder().encode(
  process.env.AGENT_SESSION_SECRET || "change-me-in-production",
);
const COOKIE_NAME = "agent-session";
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days

export async function createSession(agentId: string): Promise<void> {
  const agent = await prisma.agentUser.findUnique({
    where: { id: agentId },
    include: { org: true },
  });

  if (!agent) throw new Error("Agent not found");

  const payload: AgentSession = {
    agentId: agent.id,
    email: agent.email,
    orgId: agent.orgId,
    orgName: agent.org?.name || null,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  // Update lastSeenAt
  await prisma.agentUser.update({
    where: { id: agentId },
    data: { lastSeenAt: new Date() },
  });
}

export async function getSession(): Promise<AgentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);

  if (!token?.value) return null;

  try {
    const { payload } = await jwtVerify(token.value, secret);
    return payload as AgentSession;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function requireSession(): Promise<AgentSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getOrCreateOrgForEmail(email: string): Promise<string> {
  // Extract domain from email
  const domain = email.split("@")[1];
  if (!domain) throw new Error("Invalid email");

  const orgName = domain.split(".")[0]; // e.g., "remax" from "agent@remax.com"

  // Check if org exists
  let org = await prisma.org.findFirst({
    where: {
      name: {
        equals: orgName,
        mode: "insensitive",
      },
    },
  });

  if (!org) {
    org = await prisma.org.create({
      data: { name: orgName },
    });
  }

  return org.id;
}
