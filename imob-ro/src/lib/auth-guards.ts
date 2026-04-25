import { redirect } from "next/navigation";

import { getAdminPortalSession } from "@/lib/admin-portal-session";
import { auth } from "@/lib/auth";

/**
 * Pentru route handlers `app/api/**`: parolă portal sau rol admin NextAuth.
 */
export async function isAdminApiAccess(): Promise<boolean> {
  if (await getAdminPortalSession()) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

/**
 * Verify the current user is an admin (cont NextAuth cu rol admin **sau** sesiune parolă portal).
 * @throws Redirects to /admin/login sau eroare dacă are sesiune dar nu e admin
 */
export async function requireAdmin() {
  if (await getAdminPortalSession()) {
    return;
  }

  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
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
