import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  ADMIN_PORTAL_COOKIE,
  isAdminPortalPasswordConfigured,
  JWT_MAX_AGE_SEC,
  signAdminPortalToken,
} from "@/lib/admin-portal-jwt";

export const runtime = "nodejs";

function adminPortalResponseCookies() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: JWT_MAX_AGE_SEC,
    path: "/",
  };
}

function verifyPasswordPlain(plain: string): boolean {
  const expected = process.env.ADMIN_PORTAL_PASSWORD?.trim();
  if (!expected) return false;
  const a = createHash("sha256").update(`iim_ap_v1|${plain}`, "utf8").digest();
  const b = createHash("sha256").update(`iim_ap_v1|${expected}`, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * POST /api/admin/portal
 * Body JSON: { "password": "..." } — setează cookie-ul de sesiune admin (7 zile).
 *
 * Setăm cookie pe `NextResponse` explicit — pattern mai fiabil pe Vercel / App Router
 * decât `cookies().set()` doar prin `next/headers` în unele configurații.
 */
export async function POST(request: Request) {
  if (!isAdminPortalPasswordConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Parola admin nu e configurată pe server" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const password =
    body &&
    typeof body === "object" &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (!password) {
    return NextResponse.json({ error: "password_required" }, { status: 400 });
  }

  if (!verifyPasswordPlain(password)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let token: string;
  try {
    token = await signAdminPortalToken();
  } catch (e) {
    console.error("admin portal sign", e);
    return NextResponse.json(
      { error: "config", message: "Lipsește ADMIN_PORTAL_SECRET pe server" },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_PORTAL_COOKIE, token, adminPortalResponseCookies());
  return res;
}

/**
 * DELETE /api/admin/portal — șterge sesiunea (logout admin portal).
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_PORTAL_COOKIE);
  return res;
}
