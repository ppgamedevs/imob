import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, getOrCreateOrgForEmail } from "@/lib/a/auth";

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid link</h1>
          <p className="text-gray-400">This sign-in link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  try {
    // Verify token
    const magicToken = await prisma.magicToken.findUnique({
      where: { token },
    });

    if (!magicToken) {
      throw new Error("Invalid token");
    }

    if (magicToken.expiresAt < new Date()) {
      throw new Error("Token expired");
    }

    // Get or create agent user
    let agent = await prisma.agentUser.findUnique({
      where: { email: magicToken.email },
    });

    if (!agent) {
      // Create org for this email domain
      const orgId = await getOrCreateOrgForEmail(magicToken.email);

      // Create agent
      agent = await prisma.agentUser.create({
        data: {
          email: magicToken.email,
          orgId,
        },
      });
    }

    // Delete used token
    await prisma.magicToken.delete({
      where: { token },
    });

    // Create session
    await createSession(agent.id);

    // Redirect to workspace
    redirect("/a");
  } catch (error) {
    console.error("Callback error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication failed</h1>
          <p className="text-gray-400">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
      </div>
    );
  }
}
