import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Verify the current user is an admin
 * @throws Redirects to sign-in or returns 403 if not admin
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return session.user;
}

/**
 * Verify the current user is authenticated
 * @throws Redirects to sign-in if not authenticated
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return session.user;
}

/**
 * Get current user if authenticated, null otherwise
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Check if current user is admin (boolean check, no throw)
 */
export async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

/**
 * Check if user is authenticated (boolean check, no throw)
 */
export async function isAuthenticated() {
  const session = await auth();
  return !!session?.user;
}
