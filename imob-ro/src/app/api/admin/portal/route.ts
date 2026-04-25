import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  clearAdminPortalCookie,
  isAdminPortalPasswordConfigured,
  setAdminPortalCookie,
} from "@/lib/admin-portal-session";

export const runtime = "nodejs";

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

  try {
    await setAdminPortalCookie();
  } catch (e) {
    console.error("admin portal cookie", e);
    return NextResponse.json(
      { error: "config", message: "Lipsește ADMIN_PORTAL_SECRET pe server" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/portal — șterge sesiunea (logout admin portal).
 */
export async function DELETE() {
  await clearAdminPortalCookie();
  return NextResponse.json({ ok: true });
}
