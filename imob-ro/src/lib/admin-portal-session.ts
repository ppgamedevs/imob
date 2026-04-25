import { cookies } from "next/headers";

import {
  ADMIN_PORTAL_COOKIE,
  isAdminPortalPasswordConfigured,
  JWT_MAX_AGE_SEC,
  signAdminPortalToken,
  verifyAdminPortalToken,
} from "@/lib/admin-portal-jwt";

export {
  ADMIN_PORTAL_COOKIE,
  isAdminPortalPasswordConfigured,
  verifyAdminPortalToken,
} from "@/lib/admin-portal-jwt";

/**
 * Sesiune parolă activă (RSC, API route, server actions).
 */
export async function getAdminPortalSession(): Promise<boolean> {
  if (!isAdminPortalPasswordConfigured()) return false;
  const c = (await cookies()).get(ADMIN_PORTAL_COOKIE);
  if (!c?.value) return false;
  return verifyAdminPortalToken(c.value);
}

export async function setAdminPortalCookie(): Promise<void> {
  const token = await signAdminPortalToken();

  (await cookies()).set(ADMIN_PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: JWT_MAX_AGE_SEC,
    path: "/",
  });
}

export async function clearAdminPortalCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_PORTAL_COOKIE);
}
