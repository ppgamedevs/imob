"use server";

import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_PORTAL_COOKIE,
  isAdminPortalPasswordConfigured,
  JWT_MAX_AGE_SEC,
  signAdminPortalToken,
} from "@/lib/admin-portal-jwt";

export type AdminLoginState = { error: string } | null;

function debugAdminPortal(step: string, extra?: string) {
  if (process.env.DEBUG_ADMIN_PORTAL !== "1") return;
  console.error(
    "[admin-portal:loginToAdminPortal]",
    step,
    extra ? extra.replace(/\s/g, " ") : "",
  );
}

function safeFromParam(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/admin";
  if (!v.startsWith("/admin")) return "/admin";
  return v;
}

function verifyPasswordPlain(plain: string): boolean {
  const expected = process.env.ADMIN_PORTAL_PASSWORD?.trim();
  if (!expected) return false;
  const a = createHash("sha256").update(`iim_ap_v1|${plain}`, "utf8").digest();
  const b = createHash("sha256").update(`iim_ap_v1|${expected}`, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * Login admin prin parolă, pe server. Setează cookie + redirect fără fetch în client
 * (evită probleme cu rețele, extensii, sau Set-Cookie pe rute API).
 */
export async function loginToAdminPortal(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!isAdminPortalPasswordConfigured()) {
    debugAdminPortal("abort", "no ADMIN_PORTAL_PASSWORD");
    return {
      error:
        "Lipsește ADMIN_PORTAL_PASSWORD pe server. Setează variabila de mediu și redeployează.",
    };
  }

  const from = safeFromParam(formData.get("from"));
  const passwordRaw = formData.get("password");
  const password = typeof passwordRaw === "string" ? passwordRaw.trim() : "";
  if (!password) {
    debugAdminPortal("abort", "empty password");
    return { error: "Introdu parola." };
  }
  if (!verifyPasswordPlain(password)) {
    debugAdminPortal("abort", "wrong password");
    return { error: "Parolă incorectă." };
  }

  let token: string;
  try {
    token = await signAdminPortalToken();
  } catch {
    debugAdminPortal("abort", "sign token failed (ADMIN_PORTAL_SECRET?)");
    return { error: "Lipsește sau e invalidă ADMIN_PORTAL_SECRET pe server." };
  }

  const jar = await cookies();
  debugAdminPortal("cookie_set+redirect", `from=${from}`);
  jar.set(ADMIN_PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: JWT_MAX_AGE_SEC,
    path: "/",
  });

  redirect(from);
}
