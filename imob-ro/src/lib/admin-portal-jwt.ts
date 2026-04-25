import { jwtVerify, SignJWT } from "jose";

/**
 * JWT admin portal — fără dependență de `next/headers` (safe în middleware Edge).
 */
export const ADMIN_PORTAL_COOKIE = "iim_aps_v1";

const DEV_FALLBACK_SECRET = "dev-only-admin-portal-secret-not-for-prod-32b!!";
const JWT_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function tryGetSecretKeyBytes(): Uint8Array | null {
  const s = process.env.ADMIN_PORTAL_SECRET?.trim();
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return null;
}

function requireSecretKeyBytesForSigning(): Uint8Array {
  const k = tryGetSecretKeyBytes();
  if (!k) {
    throw new Error(
      "ADMIN_PORTAL_SECRET is required in production to sign the admin portal session",
    );
  }
  return k;
}

export function isAdminPortalPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PORTAL_PASSWORD?.trim());
}

export async function verifyAdminPortalToken(token: string): Promise<boolean> {
  const key = tryGetSecretKeyBytes();
  if (!key) return false;
  try {
    const { payload } = await jwtVerify(token, key);
    return payload.typ === "iim_ap_v1";
  } catch {
    return false;
  }
}

export async function signAdminPortalToken(): Promise<string> {
  // jose: numeric `setExpirationTime` = Unix *timestamp*, not a duration (e.g. 604800s became exp=1970).
  const exp = new Date(Date.now() + JWT_MAX_AGE_SEC * 1000);
  return new SignJWT({ typ: "iim_ap_v1" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(requireSecretKeyBytesForSigning());
}

export { JWT_MAX_AGE_SEC };
